"use strict";
// Port of Kervyxa's apps/web/lib/verification/snapshot-package.ts command inspection.
// A repository's declared "test" script is frozen into a contract; a green baseline is only
// evidence if that script actually ran a program.

/** Shell words that run no program: a "test" made only of these executes zero tests. */
const SHELL_NOOPS = new Set(["exit", "true", "false", ":", "echo", "printf", "cd", "sleep"]);

/** The first word of every simple command in a shell line, after assignments, `env` and `exec`. */
function commandHeads(shell) {
  return shell
    .split(/\|\||&&|[;|&()]|\n/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const words = segment.split(/\s+/);
      let i = 0;
      while (
        i < words.length &&
        (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || words[i] === "env" || words[i] === "exec")
      ) {
        i += 1;
      }
      return words[i] || "";
    })
    .filter((w) => w.length > 0);
}

/** null when the command runs at least one program; otherwise the reason it would prove nothing. */
function commandRunsNothingIssue(shell) {
  const heads = commandHeads(shell);
  if (heads.length === 0) {
    return 'the "test" script is empty, so there is no test command to freeze';
  }
  if (heads.every((head) => SHELL_NOOPS.has(head.slice(head.lastIndexOf("/") + 1)))) {
    return (
      `the "test" script (${shell}) runs no program, only shell built-ins, so a passing baseline ` +
      "would prove nothing; declare the command that actually runs the tests (e.g. `node test.js`)"
    );
  }
  return null;
}

module.exports = { SHELL_NOOPS, commandHeads, commandRunsNothingIssue };
