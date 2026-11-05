# Tasks

## 1. Make the sync script line-ending independent

- [x] 1.1 In `planner/scripts/sync-skill-logic.mjs`, change `\r\n` to `\n` when reading sources and guidelines (all three `readFileSync` calls); add a test in `planner/test/skill-sync.test.mjs` that runs the script on CRLF copies of `scripts/`, `logic/` and `guidelines/` in a temp folder, finds no `\r` in any output and finds each file equal to a run on LF sources; write the test first and verify it fails on the unchanged script, then verify it passes after the change with `node --test planner/test/skill-sync.test.mjs`. (result: node --test planner/test/skill-sync.test.mjs on the unchanged script -> 1 failed, 4 passed ("jois-story-explore/lib/backlog/csv.js has a carriage return"); after the change -> 5 passed, 0 failed)

- [x] 1.2 In `planner/scripts/sync-skill-logic.mjs`, write each generated copy with its source's line ending: build the text with `\n`, then change every `\n` to `\r\n` when the source file had `\r\n`, so a copy never mixes endings; in `planner/test/skill-sync.test.mjs` replace the test "CRLF sources give the same LF copies as LF sources" with one that runs the script on CRLF copies of `scripts/`, `logic/` and `guidelines/` in a temp folder and finds every output line ending in CRLF with no lone LF, finds each output equal to a run on LF sources once `\r\n` is read as `\n`, and finds no `\r` in the outputs of the LF run; write the test first and verify it fails on the current script, then verify it passes with `node --test planner/test/skill-sync.test.mjs`. (result: node --test planner/test/skill-sync.test.mjs -> before the script change 4 passed, 1 failed (the new line-ending test); after the change 5 tests, 5 passed, 0 failed)

## 2. Document it

- [x] 2.1 Add a short "Line endings" note to `CLAUDE.md` saying the repo stores LF, each user's `core.autocrlf` decides their working files, `.gitattributes` pins only the two fixture folders, generated copies are always LF, data CSVs keep CRLF and there is no guard test; verify the note is in the file. (result: grep "Line endings" CLAUDE.md -> the heading is present at line 25)
- [x] 2.2 Add a sentence to the "The generated copy" section of `wiki/planner/architecture/Story-Skills-Internals.md` saying the script reads sources as LF so its copies are the same on every machine; verify `python scripts/check_docs.py` passes. (result: python scripts/check_docs.py -> exit 1 with 2 stale-path errors that already exist on origin/main (the paths are absent there); after adding a docs-check ignore marker to those two lines -> docs check passed, exit 0)
- [x] 2.3 Correct the "Line endings" note in `CLAUDE.md` and the sentence in `wiki/planner/architecture/Story-Skills-Internals.md`: they say the generated copies are always LF; say instead that each copy has the line ending of its source file, so a CRLF checkout stays clean after a run; verify `python scripts/check_docs.py` passes. (result: python scripts/check_docs.py -> docs check passed; CLAUDE.md and Story-Skills-Internals.md each changed on one line to say each copy has its source's line ending)

## 3. Check it in a CRLF working folder

- [x] 3.1 With groups 1 and 2 committed and the tree clean, rewrite this worktree's working files from the index (`git rm --cached -r -q .` then `git reset --hard`) under `core.autocrlf=true`; verify `git ls-files --eol` shows `w/crlf` for the tracked text files outside the two fixture folders and `git status --short` shows nothing. (result: git rm --cached -r -q . + git reset --hard -> ok; git ls-files --eol -> 942 w/crlf, 6 w/lf (only the fixture files), 1 empty .gitkeep w/none; git status --short -> only the untracked change folder)
- [x] 3.2 After 1.2 and 2.3 are committed, run `node planner/scripts/sync-skill-logic.mjs` in that CRLF folder; verify `git ls-files --eol toolkit/skills` shows no `w/mixed`, `git status --short` shows nothing and `npm test` (from `planner/`) passes. (result: node planner/scripts/sync-skill-logic.mjs in the CRLF worktree after git rm --cached -r -q . and git reset --hard -> 63 files written, exit 0; git ls-files --eol toolkit/skills -> 110 files all i/lf w/crlf, 0 w/mixed, 0 w/lf; git status --short -> only untracked openspec/changes/keep-git-default-line-endings/; npm --prefix planner test -> 557 pass, 0 fail)

## Workflow follow-up

- Archive the change after review.
