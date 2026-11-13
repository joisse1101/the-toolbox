# Tasks

## 1. Group the frontend by tool and feature

- [x] 1.1 Re-run the import map for `viewer/frontend/src` (which file imports each component, hook and lib file). Then `git mv` every file to its folder in the layout in `design.md`: `src/app/`, `src/shared/{ui,hooks,lib,api}`, and `src/tools/backlog/{shell,shared,features/*}`. `App.jsx` becomes `tools/backlog/BacklogTool.jsx`, and `tool.css` becomes `backlog.css`. Fix only the import paths. Verify: `cd viewer; npm run build` succeeds, and both pages still load from `node backend/server.cjs`.
- [x] 1.2 Move the pure-module tests under `viewer/test/frontend/` so their imports follow the moved files. Verify: `cd viewer; npm test` passes.
- [x] 1.3 Add the three frontend zone rules from `design.md` to `viewer/test/zones.test.mjs`. Verify: the test passes, and it fails when you add a temporary import from `features/graph` into `features/stories` (remove it afterwards).

## 2. Server serves the app for page addresses

- [x] 2.1 Add `staticTarget(pathname)` (kinds `api`, `file` and `app`) to the server, and use it in `handleStatic`: serve `dist/index.html` for an `app` path, a 404 for a missing `file`, and drop the folder redirect. Add `viewer/test/backend/server-static.test.mjs`, covering the three scenarios of "The server serves the app for every page address" in `specs/viewer-navigation/spec.md` against a started server and a temp `dist`. Verify: `cd viewer; node --test --import ./test/setup.mjs test/backend/server-static.test.mjs` passes.

## 3. Routes and tabs

- [x] 3.1 Add `react-router` (exact version 7.x) to `viewer/package.json` with `npm install`. Remove `backlog-portal/index.html` and the second Vite input. Add `src/app/routes.jsx` with the routes in `design.md`, plus `HomePage` (today's launcher text, linking to `/backlog`) and `NotFoundPage` (app style, link to `/`). Verify: `npm run build` emits one HTML file, and in the built app `/`, `/backlog`, `/reports` and `/backlog-portal/` behave as the spec says.
- [x] 3.2 Add `tools/backlog/tabs.js` with the tab list and `resolveTab(requested, { hasBacklog, hasReview })`, plus `shell/useTab.js`. Remove `view` and its action from the `useBacklog` reducer, and change every `actions.setView` call to `setTab`, passing `replace` for the Settings-switch and leave-Review fallbacks. Extract the Editor panel into `features/editor/EditorTab.jsx`. Add `viewer/test/frontend/tabs.test.mjs` for `resolveTab`, covering the scenarios of "Each tool and tab has an address" and "An unavailable tab falls back". Verify: the test passes, and `grep -rn setView viewer/frontend/src` prints nothing.
- [x] 3.3 Check the address behaviour in the built app against `specs/viewer-navigation/spec.md`. Use the `playwright-cli` skill against `node backend/server.cjs`, with `VIEWER_CONFIG` pointing at a temp copy of `viewer/test/sample-config.yaml` and the sample data, never the real data. Check: choosing a tab by mouse and by arrow key changes the address; Back returns to the previous tab; reload on `/backlog/lexicon` keeps Lexicon; `/backlog/stories` with an empty data folder shows Settings. Verify: each listed check passes, and no browser console error appears.

## 4. Docs

- [x] 4.1 Update `wiki/viewer/architecture/Portal.md` (routes, the fallback rule, the folder layout and the frontend zone rules), the Viewer Guide (the addresses a user can bookmark), and `CLAUDE.md` (one HTML entry, the frontend zones). Verify: `python scripts/check_docs.py` passes.

## 5. Whole-change test run

- [x] 5.1 Run every test suite and the build, and fix any failure this change caused. Verify: `cd viewer; npm test`, `cd viewer; npm run build`, `node --test <abs>/toolkit/tests/story/*.test.mjs`, `python scripts/check_docs.py` and `openspec validate --all --strict` each exit 0.

## Workflow follow-up

- Archive with `/opsx:archive` after review.
