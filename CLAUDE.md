# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run the `npm` commands from `planner/`, which holds `package.json`, `package-lock.json` and `node_modules/` (the toolkit has none; the `jois-story-plan` skill has its own `package.json` for the Mermaid check).

```
cd planner
npm install
npm start            # unified: build if needed + server + open browser (-- --dev for hot reload)
npm run build        # vite build -> planner/portal/dist/ (required after any change to planner/portal/web/ or planner/logic/ before the server shows it)
node planner/portal/server/server.cjs   # serves planner/portal/dist/ + CSV API on 127.0.0.1:3000 (PORT env to change; the data folder comes from `planner/planner.config.yaml`, or the file `PLANNER_CONFIG` names)
npm run dev          # Vite dev server with HMR; proxies /api to the backend, so run both
npm test             # node --test --import ./test/setup.mjs test/*.test.mjs test/*/*.test.mjs (setup.mjs points PLANNER_CONFIG at test/sample-config.yaml, whose dataDir is test/sample-data/)
node --test planner/test/logic/ids.test.mjs                  # single test file
node --test --test-name-pattern="renumber" planner/test/logic/ids.test.mjs   # single test by name
```

There is no linter or type checker. Tests cover only the pure modules (no DOM/React tests). `npm test` never reads the real `planner/data/`: `planner/test/setup.mjs` (loaded with `--import`) sets `PLANNER_CONFIG` to the committed `planner/test/sample-config.yaml`, whose `dataDir` is the committed `planner/test/sample-data/` (same layout as `planner/data/`; read-only, a test that writes uses a temp copy) and a guard test in `paths.test.mjs` fails if it is dropped. A test run alone with plain `node --test <file>` skips the setup file, so a test that needs data sets `PLANNER_CONFIG` itself (a test that saves the config points it at a temp copy).

The toolkit has its own tests, separate from `npm test`: `cd toolkit; python check_toolkit.py; python -m pytest` (needs Python and pytest), and `node --test <abs>/toolkit/tests/story/*.test.mjs` for the story skills.

## Line endings

Git stores every tracked file with LF, and each user's `core.autocrlf` setting decides whether their working files are LF or CRLF, so the repo does not force one. `.gitattributes` pins only `planner/test/sample-data/**` and `toolkit/tests/story/fixtures/**` to LF, because tests match fixture text with `\n`. Each generated skill copy has the line ending of its source file, because `planner/scripts/sync-skill-logic.mjs` reads sources as LF and then writes each copy with its source's ending (CRLF in a CRLF checkout, LF otherwise, never a mix), so git reports no change after a run. The data CSVs keep CRLF, because the CSV writer emits it. No test guards line endings.

## Zones

This repo holds local tools for a team lead's admin work: the backlog planner in `planner/` and the global toolkit in `toolkit/`. The zones depend in one direction only, enforced by `planner/test/zones.test.mjs`:

- `planner/logic/` imports nothing outside itself.
- `planner/portal/` imports `planner/logic/` and `planner/guidelines/`.
- `toolkit/` imports nothing outside itself.

Nothing in `planner/logic/` imports the portal, and nothing imports the contents of `planner/data/`. The architecture behind this is in the wiki, see the table below.

The repo is ESM (`"type": "module"` in `planner/package.json`); `planner/portal/server/server.cjs`, `planner/logic/storage/file-name.cjs` and `planner/logic/storage/paths.cjs` stay CommonJS (the `.cjs` extension), so the server and the ESM skill scripts can share them.

## Workflow

Changes are managed with OpenSpec (`openspec/`) and use conventional-commit prefixes. Use the `opsx:*` skills (propose / apply / archive). The details, and the steps to add a new tool, are in [Workflow](wiki/Workflow.md).

<!-- jois-init:docs begin -->
## Where the docs are

- The docs live in `wiki/` as nested pages. They are the source of truth.
- The GitHub wiki is a one-way copy. Never edit it; the next publish overwrites it.
- Read the page for your topic before you change the code it describes. Update it in the same change.
- Run `python scripts/check_docs.py` after any docs or path change.

| If you work on | Read first |
| --- | --- |
| Anything (start here) | [Home](wiki/Home.md) |
| The planner, its portal, data folder or story skills (`wiki/planner/`) | [Planner Guide](wiki/planner/Planner-Guide.md), then [Logic Layer](wiki/planner/architecture/Logic-Layer.md) |
| The toolkit's skills, commands, rules or installer (`wiki/toolkit/`) | [Toolkit Guide](wiki/toolkit/Toolkit-Guide.md) |
| Making a change, committing, or adding a tool | [Workflow](wiki/Workflow.md) |

Add one row per topic folder as `wiki/` grows.
<!-- jois-init:docs end -->
