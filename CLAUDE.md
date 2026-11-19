# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run the `npm` commands from `viewer/`, which holds `package.json`, `package-lock.json` and `node_modules/` (the toolkit has none; the `jois-story-plan` skill has its own `package.json` for the Mermaid check).

```
cd viewer
npm install
npm start            # unified: build if needed + server + open browser (-- --dev for hot reload)
npm run build        # vite build -> viewer/frontend/dist/ (required after any change to viewer/frontend/ or viewer/shared/ before the server shows it)
node viewer/backend/server.ts    # serves viewer/frontend/dist/ + CSV API on 127.0.0.1:3000 (PORT env to change; VIEWER_DIST_DIR serves another dist folder; the data folder comes from `viewer/viewer.config.yaml`, or the file `VIEWER_CONFIG` names)
npm run dev          # Vite dev server with HMR; proxies /api to the backend, so run both
npm run lint         # ESLint over viewer/ and toolkit/ (zone rules, typescript-eslint, React hooks); run from the repo root by the script
npm run typecheck    # tsc in check-only mode, strict, over the three tsconfigs (see below)
npm test             # node --test --import ./test/setup.ts "test/**/*.test.ts" (setup.ts points VIEWER_CONFIG at test/sample-config.yaml, whose dataDir is test/sample-data/)
node --test viewer/test/shared/ids.test.ts                   # single test file
node --test --test-name-pattern="renumber" viewer/test/shared/ids.test.ts   # single test by name
```

`npm run lint` runs ESLint 10 (flat config in `viewer/eslint.config.mjs`) over `viewer/` and `toolkit/` from the repo root. It enforces the zone rules (see Zones), the `typescript-eslint` recommended rules (no type information) and the React hooks rules on the frontend; a file override in the config carries a comment that gives its reason. TypeScript is aliased in `viewer/package.json`: `typescript` points to `npm:@typescript/typescript6@6.0.2` because `typescript-eslint` does not support TypeScript 7 yet, and a second package named @typescript/native is `npm:typescript@7.0.2`, which `npm run typecheck` runs by path. The alias is temporary and can go when TypeScript 7.1 ships a compiler API that `typescript-eslint` supports. The CI workflow `.github/workflows/ci.yml` runs on every pull request and on pushes to `main` (see [Workflow](wiki/Workflow.md)). `npm run typecheck` runs `tsc` (check only, strict) over three configs: `viewer/tsconfig.node.json` (backend, shared, scripts and tests, Node types, no DOM), `viewer/frontend/tsconfig.json` (the React app, DOM types) and `viewer/test/frontend/tsconfig.json` (the frontend tests, DOM and Node types). Tests cover only the pure modules (no DOM/React tests). `npm test` never reads the real `viewer/data/`: `viewer/test/setup.ts` (loaded with `--import`) sets `VIEWER_CONFIG` to the committed `viewer/test/sample-config.yaml`, whose `dataDir` is the committed `viewer/test/sample-data/` (same layout as `viewer/data/`; read-only, a test that writes uses a temp copy) and a guard test in `viewer/test/shared/paths.test.ts` fails if it is dropped. A test run alone with plain `node --test <file>` skips the setup file, so a test that needs data sets `VIEWER_CONFIG` itself (a test that saves the config points it at a temp copy).

The toolkit has its own tests, separate from `npm test`: `cd toolkit; python check_toolkit.py; python -m pytest` (needs Python and pytest), and `node --test <abs>/toolkit/tests/story/*.test.mjs` for the story skills.

## Line endings

Git stores every tracked file with LF, and each user's `core.autocrlf` setting decides whether their working files are LF or CRLF, so the repo does not force one. `.gitattributes` pins only `viewer/test/sample-data/**` and `toolkit/tests/story/fixtures/**` and `toolkit/sample/story-to-code/**` to LF, because tests match their text with `\n`. Each generated skill copy has the line ending of its source file, because `viewer/scripts/sync-skill-logic.ts` reads sources as LF and then writes each copy with its source's ending (CRLF in a CRLF checkout, LF otherwise, never a mix), so git reports no change after a run. The data CSVs keep CRLF, because the CSV writer emits it. No test guards line endings.

## Zones

This repo holds local tools for a team lead's admin work: the backlog viewer in `viewer/` and the global toolkit in `toolkit/`. The zones depend in one direction only, enforced by the linter (`npm run lint`). The rules live in `viewer/eslint.config.mjs`, and `viewer/test/lint/zones.test.ts` (part of `npm test`) lints made-up breach and clean imports, so a broken or loosened rule fails the tests:

- `viewer/shared/` imports nothing outside itself.
- `viewer/backend/` imports `viewer/backend/` and `viewer/shared/`.
- `viewer/frontend/` imports `viewer/frontend/` and `viewer/shared/` (the guidelines included).
- `viewer/backend/` and `viewer/frontend/` never import each other.
- `toolkit/` imports nothing outside itself.

Inside `viewer/frontend/src/` the same linter enforces three more rules: `shared/` imports nothing under `tools/` or `app/`, a tool imports no other tool, and a feature (`tools/<tool>/features/<feature>/`) imports no other feature (code two features share goes in `tools/<tool>/shared/`). `app/` may import tools. The frontend is one page: `viewer/frontend/index.html` is the only HTML entry, and React Router (`viewer/frontend/src/app/routes.tsx`) gives each tool and tab its address.

Nothing in `viewer/shared/` imports the backend or the frontend, and nothing imports the contents of `viewer/data/`. The architecture behind this is in the wiki, see the table below.

Imports use three `#` aliases, `#shared/*`, `#backend/*` and `#frontend/*`, defined once in the `imports` field of `viewer/package.json` (they map to `viewer/shared/`, `viewer/backend/` and `viewer/frontend/`). Node, `tsc` and Vite all resolve them, and the specifier keeps its file extension, for example `#shared/backlog/ids.ts`. Use an alias for an import that crosses a zone or climbs two or more folders to another part of the same zone. Keep short relative imports, and relative imports inside one feature. `viewer/shared/` internals and `toolkit/` stay relative, because `viewer/scripts/sync-skill-logic.ts` follows only relative imports. The lint resolver (`eslint-import-resolver-typescript`) resolves the aliases before the zone rules apply, and `npm run typecheck` reports a `#` import that no alias maps.

The viewer is TypeScript in ES modules (`"type": "module"` in `viewer/package.json`): `.ts` for the backend, shared code, scripts and tests, and `.tsx` for React components. Node 24+ runs the `.ts` files directly by stripping the types, so the server, the scripts and the tests need no build step; only the frontend is built, by Vite. No `.cjs` file remains in the viewer. `viewer/scripts/sync-skill-logic.ts` strips the types from the shared `.ts` files and writes each copy into `toolkit/skills/*/lib/` as a plain `.mjs` ES module, so the skill scripts import those copies directly. The toolkit's own scripts stay JavaScript (`.mjs`, `.js`).

## Workflow

Changes are managed with OpenSpec (`openspec/`) and use conventional-commit prefixes. Use the `opsx:*` skills (propose / apply / archive). The details, and the steps to add a new tool, are in [Workflow](wiki/Workflow.md).

## Testing an edit to a story-to-code skill

When you edit a skill or command of the story-to-code flow (`toolkit/skills/jois-story-*` or `toolkit/commands/jois-code/`), test it live in the sample's mock repo, and never in this repo or the user's own projects. The sample is `toolkit/sample/story-to-code/`; its README is the full guide.

1. Build the mock repo at the stage just before the edited stage, for example `toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage planned -Reset` to test apply. It builds `.scratch/mock-app/` and calls no model.
2. Reinstall the edited item at project scope with `toolkit\install\Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill <name> -Force` (`-Command jois-code` for a command).
3. A global copy of a skill loads ahead of the project copy, so check which copy a session loads before you trust a result. Never remove, rename or reinstall a global copy: that writes to `~/.claude`, so ask the user first.
4. Run the skill with Claude started in `.scratch/mock-app/`. A headless session cannot answer questions, so give it the answers in the prompt.
5. Run `node --test toolkit/tests/story/sample-stages.test.mjs` to see whether the saved stages still pass the checkers. If a format change makes it fail, the sample needs recording again, which costs real model tokens, so ask the user first.

<!-- jois-init:docs begin -->
## Where the docs are

- The docs live in `wiki/` as nested pages. They are the source of truth.
- The GitHub wiki is a one-way copy. Never edit it; the next publish overwrites it.
- Read the page for your topic before you change the code it describes. Update it in the same change.
- Run `python scripts/check_docs.py` after any docs or path change.

| If you work on | Read first |
| --- | --- |
| Anything (start here) | [Home](wiki/Home.md) |
| Building a feature from user stories (explore to archive, and which command is next) | [Story to Code](wiki/Story-To-Code.md) |
| The viewer, its data folder or story skills (`wiki/viewer/`) | [Viewer Guide](wiki/viewer/Viewer-Guide.md), then [Logic Layer](wiki/viewer/architecture/Logic-Layer.md) |
| The toolkit's skills, commands, rules or installer (`wiki/toolkit/`) | [Toolkit Guide](wiki/toolkit/Toolkit-Guide.md) |
| Making a change, committing, or adding a tool | [Workflow](wiki/Workflow.md) |

Add one row per topic folder as `wiki/` grows.
<!-- jois-init:docs end -->
