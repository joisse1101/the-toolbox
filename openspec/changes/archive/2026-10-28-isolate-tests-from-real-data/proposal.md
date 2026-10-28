## Why

Two tests in `planner/test/claude/read-story-context.test.mjs` run the real script without `PLANNER_DATA_DIR`, so they read `planner/data/` and ask for a backlog called `data-portal.csv`. That folder is git-ignored and private: on a fresh clone, or after the data is moved or emptied, both tests fail. Whether `npm test` passes must never depend on the maintainer's real data.

## What Changes

- Add a small committed mock data folder, `planner/test/sample-data/`, shaped like `planner/data/` (a mock backlog, and the lexicon / proposals files the tests need).
- Point the two CLI tests (`CLI: lists backlogs, prints the menu, …` and `CLI: --section prints just that section …`) at the fixture instead of `data-portal.csv`.
- Add a test setup file, `planner/test/setup.mjs`, loaded by `npm test` through `node --test --import`. It sets `PLANNER_DATA_DIR` to the fixture folder, and spawned scripts inherit it, so no test can reach the real data by accident.
- Keep `paths.test.mjs` (which tests the default data folder and the old `TLT_DATA_DIR` name) passing under the setup file.
- Update `CLAUDE.md`'s test commands and the `planner/data/` note to describe the fixture and the setup file.

Out of scope: the `the ready file appears only once the tool list has been sent…` test in `backlog-tools-ready.test.mjs` failed once against the real data. It already uses a temp dir and looks timing-flaky, which is a separate problem.

Not breaking. Running a single test file with `node --test <file>` (no setup file) still works because the tests that need data pass their own folder.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. This is test tooling and changes no product behaviour, so the change sets `skip_specs: true`.

## Impact

- New: `planner/test/sample-data/**`, `planner/test/setup.mjs`.
- Edited: `planner/test/claude/read-story-context.test.mjs`, the `test` script in `planner/package.json`, `CLAUDE.md`.
- No change to product code, `planner/data/`, or the toolkit's tests.
