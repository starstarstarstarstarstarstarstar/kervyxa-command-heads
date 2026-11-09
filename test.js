"use strict";
// Port of the command-inspection cases from Kervyxa's snapshot-package.test.ts to node:test.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { commandHeads, commandRunsNothingIssue } = require("./command-heads.js");

test("the head of a plain command is its program", () => {
  assert.deepEqual(commandHeads("node test.js"), ["node"]);
});

test("assignments, env and exec prefixes are skipped; every chained command is listed", () => {
  assert.deepEqual(commandHeads("FOO=1 env exec node a.js && echo done"), ["node", "echo"]);
  assert.deepEqual(commandHeads("node a.js; node b.js || true"), ["node", "node", "true"]);
});

test("an empty script is reported as empty", () => {
  assert.match(commandRunsNothingIssue(""), /empty/);
  assert.match(commandRunsNothingIssue("   "), /empty/);
});

test("a script made only of shell built-ins runs nothing", () => {
  assert.match(commandRunsNothingIssue("exit 0"), /runs no program/);
  assert.match(commandRunsNothingIssue("echo ok && exit 0"), /runs no program/);
  assert.match(commandRunsNothingIssue("printf ok; true"), /runs no program/);
  assert.match(commandRunsNothingIssue("/bin/true"), /runs no program/);
});

test("a script that runs a program is accepted", () => {
  assert.equal(commandRunsNothingIssue("node test.js"), null);
  assert.equal(commandRunsNothingIssue("node test.js && echo done"), null);
  assert.equal(commandRunsNothingIssue("NODE_ENV=test node test.js"), null);
});
