# Tasks

## 1. Move the files

- [x] 1.1 Re-check which storage modules only the server imports (grep each of `backlog-files`, `project-config`, `project-folders`, `storage/paths`, `starting-files` across `planner/logic` and `planner/portal`). Then `git mv` every tracked file under `planner/` to its place in the target layout in `design.md`. Make no content edits in this task. Verify: `git status` shows only renames (`R`), and `git ls-files planner` prints nothing.

## 2. Make the moved code run

- [x] 2.1 Fix every relative `import`/`require` in `viewer/backend`, `viewer/frontend/src` and `viewer/shared` for the new folders. Fix the server's `DIST_DIR` (`viewer/frontend/dist`) and the Vite config (root `viewer/frontend`, `outDir` `dist`, both HTML inputs). Fix the `package.json` scripts (`--config frontend/vite.config.mjs`, `start` runs `scripts/start.mjs`, `test` globs `test/*.test.mjs test/*/*.test.mjs`) and every path in `scripts/start.mjs`. Verify: `cd viewer; npm install; npm run build` succeeds, and `node backend/server.cjs` serves the launcher on 127.0.0.1:3000 (stop it afterwards).
- [x] 2.2 In `backend/storage/project-config.cjs`, make the default config `viewer/viewer.config.yaml`, read `VIEWER_CONFIG` instead of `PLANNER_CONFIG`, and make the default data folder `viewer/data`. In the server's folder confinement, allow `viewer/data` and protect `viewer/shared`. Rename `viewer.config.example.yaml` and update its comments. Update the tests to the spec delta in `specs/project-config/spec.md`, including the new scenario "The old variable is not read". Verify: `cd viewer; npm test` passes the project-config, paths and server tests.
- [x] 2.3 Point `test/setup.mjs` and every test that sets the variable at `VIEWER_CONFIG`. Fix the test helpers' and sample-data paths, and the guard test in `test/shared/paths.test.mjs` that checks the setup. Verify: the guard test fails when `setup.mjs` does not set `VIEWER_CONFIG` (try it once, then restore).
- [x] 2.4 Rewrite `test/zones.test.mjs` to the zone rule in `design.md` (shared, backend, frontend, toolkit) and its coverage check. Verify: the test passes, and it fails when you add a temporary `import` from `viewer/frontend/src` into a `viewer/backend` file (remove it afterwards).
- [x] 2.5 Point `scripts/sync-skill-logic.mjs` at `viewer/shared` and `viewer/shared/guidelines`, then run it. Verify: `cd viewer; node --test --import ./test/setup.mjs test/skill-sync.test.mjs` passes, and `git diff toolkit/skills` changes only the generated header lines.

## 3. Toolkit text names the viewer

- [x] 3.1 Replace `planner/` paths in `toolkit/README.md`, `toolkit/sample/story-to-code/README.md`, the `SKILL.md` of `jois-story-explore`, `jois-story-propose` and `jois-story-verify`, and `toolkit/tests/story/diagram-checks.test.mjs`, `plan-skill.test.mjs` and `tests/test_check_toolkit.py`. Verify: `grep -rn "planner/" toolkit --exclude-dir=node_modules | grep -v "/lib/\|/references/"` prints nothing, `node --test <abs>/toolkit/tests/story/*.test.mjs` passes, and `cd toolkit; python -m pytest` passes through the toolkit's `.venv`.

## 4. Repo files and docs

- [x] 4.1 Update `.gitignore` (`viewer/data/*`, `viewer/viewer.config.yaml`, `viewer/frontend/dist/`), `.gitattributes` (`viewer/test/sample-data/**`) and `.github/dependabot.yml` (`/viewer`). Verify: `git check-ignore viewer/data/x viewer/viewer.config.yaml viewer/frontend/dist/x` prints all three, using git's own temp folder rather than `.scratch/`.
- [x] 4.2 Rewrite `CLAUDE.md` (commands, zones, the `.cjs` note, line endings) and `README.md` (the folder table) for the new layout. Verify: every path they name exists (`python scripts/check_docs.py` passes).
- [x] 4.3 `git mv wiki/planner wiki/viewer` and `Planner-Guide.md` to `Viewer-Guide.md`. Then fix every path, link and the sidebar, and rename "planner" to "viewer" where it names the app. Add the section "Moving from planner/" to the Viewer Guide with the steps from the proposal's Impact list. Verify: `python scripts/check_docs.py` passes, and `grep -rn "planner/" wiki` prints only the migration section.
- [x] 4.4 Edit the Purpose line of `portal-accessibility`, `portal-safe-actions`, `portal-visual-system`, `project-config`, `project-switcher`, `project-wiki` and `backlog-guidelines` in `openspec/specs/`, saying "viewer" where they say "planner". Verify: `openspec validate --specs --strict` passes.

## 5. Whole-change test run

- [x] 5.1 Run every test suite and the build, and fix any failure this change caused. Verify: `cd viewer; npm test`, `cd viewer; npm run build`, `node --test <abs>/toolkit/tests/story/*.test.mjs`, `cd toolkit; python check_toolkit.py; python -m pytest` (through the toolkit's `.venv`), `python scripts/check_docs.py` and `openspec validate --all --strict` each exit 0.

## Workflow follow-up

- Archive with `/opsx:archive` after review.
- In the main checkout, move the config and data as the Viewer Guide says. This is the user's step, done after the merge.
