## Context

`planner/logic/storage/paths.cjs` resolves the data folder from `PLANNER_DATA_DIR` (default `planner/data/`). Most tests already build a temp root and pass it through that variable. The two `CLI:` tests in `read-story-context.test.mjs` do not: they spawn the real script, which falls back to `planner/data/` and asks for `data-portal.csv`. Run against an empty data folder, those two are the only failures; run against the real data, nothing else reads it.

## Goals / Non-Goals

**Goals:**
- `npm test` gives the same result whatever is in `planner/data/`, including nothing.
- A test that forgets to isolate itself reads the fixture, never the real data.
- The mock data is committed and readable, so a failing test can be understood from the repo alone.

**Non-Goals:**
- Fixing the flaky ready-file test (separate problem).
- Changing product code or the toolkit's Python tests.
- Replacing the existing per-test temp roots. They stay; they build exactly the shape each test needs.

## Decisions

1. **Committed fixture folder `planner/test/sample-data/`** (not `fixtures/`, which Claude does not touch), same layout as `planner/data/` (`backlogs/`, `lexicons/`, `proposals/`, ...), holding one small mock backlog (a couple of epics, one dependency, one locked story) plus a lexicon and a proposals file only if a test needs them. Mock content is invented and generic. Alternative considered: build the data inline with `temp()`. Rejected because you asked for committed mock data, and a folder can be opened and read.

2. **Fixture is read-only by convention.** A test that writes uses its own temp copy or temp root, never the fixture, so runs stay order-independent and the working tree stays clean. If a CLI test needs a write path, it copies the fixture into a temp dir first.

3. **A setup file, `planner/test/setup.mjs`, loaded with `node --test --import ./test/setup.mjs`.** It sets `process.env.PLANNER_DATA_DIR` to the fixture folder (resolved from `import.meta.url`, so it works from any working directory) unless a value is already set. `node --test` runs each file in a child process and passes `--import` along, and those processes pass their environment to the scripts they spawn. Alternatives: setting the variable in the npm script needs `cross-env` on Windows (a new dependency); a `globalSetup` does not exist in `node:test`.

4. **Clear `TLT_DATA_DIR` too.** `paths.cjs` still honours the old name when `PLANNER_DATA_DIR` is unset, so the setup file removes it; otherwise a stray variable on the maintainer's machine could redirect the tests.

5. **`paths.test.mjs` stays valid.** It spawns `paths.cjs` with an explicit environment; the checks that need the default folder delete `PLANNER_DATA_DIR` from the spawned environment themselves. Verify this when implementing and adjust only if one relies on inheriting an unset variable.

6. **The CLI tests name the fixture backlog** (for example `sample.csv`) instead of `data-portal.csv`, and no longer assume the real `planner/guidelines/` content beyond what is committed (guidelines are already in the repo).

## Risks / Trade-offs

- **Running one file with plain `node --test <file>` skips the setup file.** Tests that need data must therefore also pass their own folder or the fixture explicitly; the two CLI tests will set `PLANNER_DATA_DIR` themselves, with the setup file as a second line of defence, not the only one.
- **The fixture can drift from the real data shape.** It is small and exercised by the CLI tests, and the pure-logic tests already cover the formats, so drift shows up as a failing test in the repo, not on one machine.
- **A guard test is worth adding:** one assertion that `DATA_DIR` under `npm test` is the fixture folder, so the setup file cannot be removed silently.
