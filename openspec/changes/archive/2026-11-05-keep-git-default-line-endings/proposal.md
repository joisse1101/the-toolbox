# Proposal

## Why

The repo stores every file with LF, and Git for Windows checks files out with CRLF by default (`core.autocrlf=true`). That default is fine and stays. The one thing it breaks is `planner/scripts/sync-skill-logic.mjs`: it reads CRLF sources and writes its `GENERATED` header with `\n` in front of a CRLF body, so each generated copy in `toolkit/skills/*/lib` and `references` has mixed endings. Git leaves a file with mixed endings unconverted on `git add`, so it counts as changed.

This was measured on a fresh CRLF clone of `main`. The sync test passes there, because the test already compares lines (change #95). After running the script, `git ls-files --eol toolkit/skills` shows 63 `w/mixed` files and `git status` lists 63 modified files, which hold only line-ending differences. Sessions keep trying to fix that by hand.

## What Changes

- Make `planner/scripts/sync-skill-logic.mjs` read every file as LF and write each copy with its source's line ending (CRLF in a CRLF checkout, LF otherwise), so no copy mixes endings and git reports no change.
- Add a test that runs the script on CRLF and on LF copies of its sources and checks the line endings of every output.
- Add a "Line endings" note to `CLAUDE.md` and a sentence to the wiki page on the generated copy.
- Rewrite this worktree's files once so they are CRLF like the user's setting. This is a local step and commits nothing.
- `.gitattributes` stays as it is, with its two fixture pins at `eol=lf`: tests match the fixture text with `\n`.
- No `.editorconfig`, no `* text=auto eol=lf` rule and no guard test. Each user's own `core.autocrlf` decides their working-folder endings.
- Data CSVs are out of scope: `toCsv` writes CRLF on purpose.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-story-skills`: each generated copy keeps its source's line ending, so a CRLF checkout shows no phantom changes after the script runs.

## Impact

- `planner/scripts/sync-skill-logic.mjs` (changed), `planner/test/skill-sync.test.mjs` (changed), `CLAUDE.md` and `wiki/planner/architecture/Story-Skills-Internals.md` (a short note each).
- No change to the portal, the server, `.gitattributes` or the data files.
- This replaces an earlier plan that forced LF on every checkout. That plan was dropped before it was pushed, because it overrode each user's git setting for a problem that only the script causes.
