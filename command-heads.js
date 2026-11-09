"use strict";
// Port of Kervyxa's apps/web/lib/verification/snapshot-package.ts command inspection.
// A repository's declared "test" script is frozen into a contract; a green baseline is only
// evidence if that script actually ran a program.

/** Shell words that run no program: a "test" made only of these executes zero tests. */
const SHELL_NOOPS = new Set(["exit", "true", "false", ":", "echo", "printf", "cd", "sleep"]);

/** Shells whose `-c <string>` form runs the string, so the string is what must be inspected. */
const SHELL_WRAPPERS = new Set(["sh", "bash", "dash", "zsh", "ksh"]);

function basename(word) {
  return word.slice(word.lastIndexOf("/") + 1);
}

/** Strips one layer of matching single or double quotes. */
function unquote(text) {
  const t = text.trim();
  if (t.length >= 2 && (t[0] === "'" || t[0] === '"') && t[t.length - 1] === t[0]) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * A `sh -c '<string>'` (or bash/dash/zsh/ksh, quoted with ' or ") at the head of a simple command
 * runs the string, so the string replaces the wrapper before anything is split. Repeated until no
 * wrapper is left, which also unwraps a wrapper inside a wrapper.
 */
const WRAPPER_RE =
  /(^|\|\||&&|[;|&()]|\n)(\s*)(?:[A-Za-z0-9_.\/-]*\/)?(?:sh|bash|dash|zsh|ksh)\s+-c\s+(?:'([^']*)'|"([^"]*)")/g;

function unwrapShellWrappers(shell) {
  let current = shell;
  for (let round = 0; round < 8; round += 1) {
    const next = current.replace(WRAPPER_RE, (_m, sep, ws, single, double) => {
      const inner = single !== undefined ? single : double;
      return `${sep}${ws}${inner}`;
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * The first word of every simple command in a shell line, after assignments, `env` (and its own
 * options), and `exec`. A shell wrapper around a string contributes the heads of the string it
 * runs, not the shell itself.
 */
function commandHeads(shell) {
  const heads = [];
  for (const raw of unwrapShellWrappers(shell).split(/\|\||&&|[;|&()]|\n/)) {
    const segment = raw.trim();
    if (segment.length === 0) continue;
    const words = segment.split(/\s+/);
    let i = 0;
    let inEnv = false;
    while (i < words.length) {
      const w = words[i];
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || w === "exec") {
        inEnv = false;
        i += 1;
      } else if (w === "env") {
        inEnv = true;
        i += 1;
      } else if (inEnv && w.startsWith("-")) {
        // env options: -i / --ignore-environment take nothing, -u / --unset take a name
        if (w === "-u" || w === "--unset") i += 2;
        else i += 1;
      } else {
        break;
      }
    }
    const head = words[i] || "";
    if (head.length === 0) continue;
    if (SHELL_WRAPPERS.has(basename(head)) && words[i + 1] === "-c" && words.length > i + 2) {
      // an unquoted -c argument: a single word is the program it runs
      heads.push(...commandHeads(unquote(words.slice(i + 2).join(" "))));
      continue;
    }
    heads.push(head);
  }
  return heads;
}

/** null when the command runs at least one program; otherwise the reason it would prove nothing. */
function commandRunsNothingIssue(shell) {
  const heads = commandHeads(shell);
  if (heads.length === 0) {
    return 'the "test" script is empty, so there is no test command to freeze';
  }
  if (heads.every((head) => SHELL_NOOPS.has(basename(head)))) {
    return (
      `the "test" script (${shell}) runs no program, only shell built-ins, so a passing baseline ` +
      "would prove nothing; declare the command that actually runs the tests (e.g. `node test.js`)"
    );
  }
  return null;
}

module.exports = { SHELL_NOOPS, commandHeads, commandRunsNothingIssue };
