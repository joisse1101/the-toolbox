# Tasks

## 1. Baseline app, wiki and mock-repo CLAUDE.md

- [x] 1.1 Scaffold `toolkit/sample/story-to-code/app/` with Vite, TypeScript and Tailwind CSS, a committed `package-lock.json`, a `.gitignore` that excludes `node_modules/`, `dist/` and `audio/`, and a `test` script. Verify: `npm ci` then `npm run build` in `app/` succeed, run in a temp copy under `.scratch/`.
- [x] 1.2 Build the baseline features: a habit list with a daily check-off, a Pomodoro timer, a task category picker (coding, writing, reading) and saving to browser local storage, with no sound. Verify: `npm run build` succeeds and the page shows all three in the dev server.
- [x] 1.3 Add one passing unit test for the storage layer (a saved check-off reads back) using the project's chosen test runner. Verify: `npm test` in `app/` passes.
- [x] 1.4 Write the mock repo's `CLAUDE.md` (test command, `wiki/` location, "docs live in `wiki/`") and `wiki/Home.md`. Verify: each repo path named in them exists in a built copy.
- [x] 1.5 Write `wiki/Future-Releases.md` listing category audio scapes, streaks, weekly stats, custom timer lengths and export/import as ideas, with the audio constraint (generated in code, optional `audio/` folder), and add a Released section that starts empty. Verify: the page is linked from `wiki/Home.md`.

## 2. Build script

- [x] 2.1 Write `build-mock-repo.ps1`: copy the sample into `.scratch/mock-app/`, run `git init`, switch to branch `sample`, install the toolkit with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app`, and run `npm ci` there. Verify: after a run, `git -C .scratch/mock-app branch --show-current` prints `sample`, `.scratch/mock-app/.claude/skills` holds the story skills, and `~/.claude` is unchanged.
- [x] 2.2 Add the stage parameter with the seven valid names, applying `stages/<stage>/` in order and the `built` patch with `git am`; stop with the list of names on an unknown stage. Verify: a run with `-Stage nonsense` exits non-zero and lists `baseline` to `archived`.
- [x] 2.3 Make the script stop when `.scratch/mock-app/` exists unless an explicit reset option is passed, and make it refuse to run with global scope or call any model. Verify: a second run without the option stops and deletes nothing.
- [x] 2.4 Add an optional one-line `build-mock-repo.bat` that only calls the `.ps1`, and write `README.md` for the sample (what it is, how to build and restore, how to record, how to test an edited skill). Verify: running the `.bat` builds the same repo as the `.ps1`.

## 3. Stages and the staleness check

- [x] 3.1 Add placeholder `stages/` content for every stage, hand-written in the committed layout (backlog `habits`, initials `H1`, one slice at design level, `tasks.md`, `source.json` with matching hashes, a small `built.patch`), enough for the staleness check to pass until the real walk replaces it. Verify: every stage folder holds the files the spec lists.
- [x] 3.2 Add `toolkit/tests/story/sample-stages.test.mjs`: load each stage's backlog, run the task and diagram checkers on its slice, confirm every story in `source.json` exists in the backlog with a matching hash, and apply `built.patch` to the baseline in a temp copy under `.scratch/`. Verify: `node --test toolkit/tests/story/sample-stages.test.mjs` passes, and fails when a story is deleted from a stage's backlog.
- [x] 3.3 Add an LF pin for `toolkit/sample/story-to-code/**` to `.gitattributes`, beside the one for `toolkit/tests/story/fixtures/**`. Verify: `git check-attr eol toolkit/sample/story-to-code/stages/planned/UC-x.md` reports `lf`.

## 4. Replace the old fixture

- [x] 4.1 Repoint `toolkit/tests/story/helpers/backlog-tree.mjs` and `planner/test/helpers/backlog-tree.mjs` to a hand-written mock in `toolkit/tests/story/fixtures/habits/` (the sample's backlog and a streaks slice written by hand), keeping the helper names. Verify: both files import and `sampleTree()` builds a data folder holding the backlog.
- [x] 4.2 Update the assertions of `diagram-checks`, `diagram-scripts`, `write-freeze`, `story-ids` and the other tests that read the fixture to its story IDs and titles, keeping each case they cover, and make `story-ids.test.mjs` inject its stored-versus-derived ID drift itself. Verify: `node --test` on those four files passes.
- [x] 4.3 Edit `planner/guidelines/diagram-conventions.md` to name the fixture's slice, then run `node planner/scripts/sync-skill-logic.mjs` to refresh `toolkit/skills/jois-story-plan/references/diagram-conventions.md`. Verify: the planner's copy-matches-source test passes.
- [x] 4.4 Delete `toolkit/tests/story/fixtures/sample/`, remove the old `.gitattributes` pin and update `CLAUDE.md`'s mention of the fixtures. Verify: `grep -r "fixtures/sample" . --exclude-dir=node_modules --exclude-dir=archive` finds nothing outside `openspec/changes/archive/`.

## 5. Docs

- [x] 5.1 Update `wiki/Story-To-Code.md` with a section that points to the sample and its build and restore commands, and update the toolkit wiki pages that name the story tests' fixtures or the sample. Verify: `python scripts/check_docs.py` passes.

## 6. Record the walk (needs the user's go-ahead)

- [x] 6.1 Stop and ask the user to start this group; do not begin it on its own. It costs real model tokens, which have not been measured. Verify: the user has said to go ahead.
- [x] 6.2 Build the mock repo and check, with a headless session started with `--model sonnet`, whether a skill installed at project scope loads ahead of a same-named global skill; write the answer in the sample's `README.md`. Verify: the README states the result and how it was checked.
- [x] 6.3 Run explore, propose, accept, plan, apply, validate and archive once in the mock repo for the streaks feature, copying each stage's files into `stages/` and moving streaks from Future releases to Released. Verify: each stage folder matches what the flow wrote, and no model session ran outside this task.
- [x] 6.4 Record the cost shown by `/cost` for the walk in the sample's `README.md`, and delete the placeholder stage content. Verify: `node --test toolkit/tests/story/sample-stages.test.mjs` passes on the real stages and restoring each stage with the script succeeds.

## 7. Final checks

- [x] 7.1 Run the project's own test commands for the whole change and fix what fails. Verify: `cd planner; npm test`, `node --test toolkit/tests/story/*.test.mjs`, `cd toolkit; python check_toolkit.py; python -m pytest`, `python scripts/check_docs.py` and `openspec validate add-story-to-code-sample --strict` all pass.

## Workflow follow-up

- Archive the change after review, following the commit rule for the archive commit.
- Open the PR with `/jois-git:write-pr`.
