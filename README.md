# kervyxa-command-heads

Kervyxa's test-command inspection, extracted from `apps/web/lib/verification/snapshot-package.ts`
as a dependency-free CommonJS module so the next change can be bought as an Outcome Contract on
[kervyxa.com](https://kervyxa.com).

`commandHeads(shell)` lists the program at the head of each simple command in a shell line.
`commandRunsNothingIssue(shell)` explains why a declared `test` script would prove nothing, or
returns `null` when it runs at least one program.

```
npm test   # = node test.js
```
