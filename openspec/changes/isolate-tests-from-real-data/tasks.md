## 1. Fixture data

- [x] 1.1 Create `planner/test/sample-data/backlogs/sample.csv` (a few stories across two epics, one `Depends On` link, one locked story) and verify `node .claude/skills/explore-stories/read-story-context.mjs sample.csv` with `PLANNER_DATA_DIR=planner/test/sample-data` prints the menu and exits 0
- [x] 1.2 Add a lexicon (`lexicons/sample.csv`) and a proposals file (`proposals/sample.csv`) only if a test needs them, and verify `--section` output for `guidelines` and the menu match what the two CLI tests assert
- [x] 1.3 Confirm `git status` shows the fixture files as tracked-addable (not caught by the `planner/data/` ignore rule) and contains no real data

## 2. Setup file

- [x] 2.1 Add `planner/test/setup.mjs` that sets `PLANNER_DATA_DIR` to the fixture folder (resolved from `import.meta.url`) unless already set, and deletes `TLT_DATA_DIR`; verify with `node --import ./test/setup.mjs -e "console.log(process.env.PLANNER_DATA_DIR)"` from `planner/`
- [x] 2.2 Change the `test` script in `planner/package.json` to `node --test --import ./test/setup.mjs test/*.test.mjs test/*/*.test.mjs` and verify `npm test` starts and finds the same test files as before
- [x] 2.3 Add a guard test that `DATA_DIR` from `paths.cjs` equals the fixture folder under `npm test`, and verify it fails when the `--import` flag is removed

## 3. Tests off the real data

- [x] 3.1 Update the two `CLI:` tests in `planner/test/claude/read-story-context.test.mjs` to use `sample.csv` and set `PLANNER_DATA_DIR` to the fixture themselves, and verify both pass
- [x] 3.2 Run `paths.test.mjs` under the setup file and verify it passes unchanged, adjusting it only if a case relied on inheriting an unset variable
- [x] 3.3 Grep `planner/test` for any remaining use of `data-portal.csv` or an unisolated spawn of a script and verify none is left

## 4. Verify independence and document

- [ ] 4.1 Run `npm test` three ways, with the real `planner/data/`, with `planner/data/` temporarily renamed, and with `PLANNER_DATA_DIR` set to an empty folder, and verify the result is identical each time (apart from the known flaky ready-file test)
- [x] 4.2 Update `CLAUDE.md` (the `npm test` line and the `planner/data/` note) to describe the fixture folder and the setup file, and verify the text matches the implemented script
