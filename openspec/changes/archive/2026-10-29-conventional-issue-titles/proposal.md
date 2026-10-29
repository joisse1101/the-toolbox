## Why

`/jois-git:write-issue` writes issue titles as plain sentences, so in the issue list a bug, a feature
and a chore look the same until each is opened. Commit messages already use `type(scope): subject`;
giving issue titles the same shape makes the kind of each issue visible at a glance (issue #18).

## What Changes

- The title step of `toolkit/commands/jois-git/write-issue.md` starts every title with a type prefix and
  a colon, then an optional scope in parentheses, then the subject: `type(scope): subject`.
- The type defaults from the issue type: bug `fix`, feature `feat`, task `chore`. Any type from the
  commit list (feat, fix, refactor, perf, style, docs, test, build, ci, chore, revert) may replace the
  default when it fits better.
- The scope is optional. It is included only when the user names one or the description clearly points
  to one area; it is never invented.
- The subject follows the commit rule: lowercase, imperative, no trailing period. The title has no
  quotes or `$`, so the existing shell-safety rule holds.
- The duplicate search uses the key terms of the subject, not the prefix.
- Bump the command's `metadata.version` and `last_updated`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-write-issue`: adds a requirement for the shape of the issue title.

## Impact

- `toolkit/commands/jois-git/write-issue.md`: step 5 (title), step 7 (search terms), step 9 (title
  rule kept), version and date.
- `openspec/specs/toolkit-write-issue/spec.md`: updated when the change is archived.
- `toolkit/README.md`: optional one-clause mention in the `write-issue` entry.
- No change to the checker, the planner or the installer.
