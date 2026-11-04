# Tasks

Land `remove-write-log` first. Run the `npm` commands from `planner/`.

## 1. Config: the `codeBase` key

- [x] 1.1 Add `codeBase` to `planner/logic/storage/project-config.cjs`: allow the key, fail on an empty value and on both keys, derive `<codeBase>/.plans` as `dataDir`, and add `PLANS_DIR` to `backlog-paths.cjs`. Verify with new cases in `planner/test/logic/project-config.test.mjs` for each `project-config` scenario of the delta. (result: `node --test planner/test/logic/project-config.test.mjs` -> 18 pass, 0 fail, including a case per `project-config` scenario for load and validation; `npm --prefix planner test` -> 456 pass, 0 fail after regenerating the 4 skill copies of `backlog-paths.cjs`)
- [x] 1.2 Make `saveConfig` accept `codeBase`, write it and remove `dataDir` in one write while keeping the user's YAML comments. Verify with a test that the saved file holds one folder key. (result: `node --test planner/test/logic/project-config.test.mjs` -> 18 pass, 0 fail, including the saved-file test with one folder key and comments kept; `npm --prefix planner test` -> 456 pass, 0 fail)
- [x] 1.3 Update `planner/planner.config.example.yaml` and verify the file parses with `loadConfig`. (result: `node --test planner/test/logic/project-config.test.mjs` -> 18 pass, 0 fail, including a test that `loadConfig` parses `planner/planner.config.example.yaml`; `npm --prefix planner test` -> 456 pass, 0 fail)

## 2. Folder work for a code base

- [x] 2.1 Add `confineCodeBase` to `planner/logic/storage/project-folders.cjs` (no `planner/data` exception, folder must exist, `.plans` must not be a file) and verify with tests for relative path, system folder, home folder, inside the repo, missing folder and `.plans` as a file. (result: `node --test planner/test/logic/project-folders.test.mjs` -> 41 pass, 0 fail, including cases for relative path, system folder, home folder, inside the repo, missing folder and `.plans` as a file; `npm --prefix planner test` -> 471 pass, 0 fail)
- [x] 2.2 Make check, init and copy work on `<codeBase>/.plans`, with init creating only `.plans`. Verify with tests for init twice, a missing code base, and a copy that skips an existing file and leaves the source untouched. (result: `node --test planner/test/logic/project-folders.test.mjs` -> 41 pass, 0 fail, including init twice, a missing code base, init creating only `.plans`, and a copy that skips an existing file and leaves the source untouched; `npm --prefix planner test` -> 471 pass, 0 fail)

## 3. Server routes

- [x] 3.1 Let `GET /api/project` report the `codeBase` when set, and let `PUT /api/project`, `POST /api/project/check`, `init` and `copy` take a `codeBase`. Verify in `planner/test/portal/server-project.test.mjs` that a code base is confined, saved and switched live, and that the busy refusal still applies. (result: `node --test planner/test/portal/server-project.test.mjs` -> 15 pass, 0 fail after fixing a test path comparison; `npm --prefix planner test` -> 474 pass, 0 fail)
- [x] 3.2 Verify that a config with only `dataDir`, and a setup with no config, are served as before, with the existing server tests unchanged and passing. (result: `node --test planner/test/portal/server-project.test.mjs` -> the 12 existing tests unchanged (0 lines removed from the file) and passing, within 15 pass, 0 fail; `npm --prefix planner test` -> 474 pass, 0 fail; the no-config case is covered at load level by `project-config.test.mjs`, not by a server test)

## 4. Settings tab

- [x] 4.1 Show the code base and add Change code base to `SettingsTab.jsx` and `useSettings.js`, with the check, offer and switch applied to `.plans`. Verify with `npm run build` and by running the portal against `planner/test/sample-data` copied into a temp folder. (result: `npm --prefix planner run build` -> built, 59 modules; running a copy of the server on a scratch sample-data copy, `/api/project/check` with `{codeBase}` -> status `missing`, `PUT {codeBase}` -> `switched:true` with `dataDir` ending `\.plans`, config file then holds `codeBase` and no `dataDir`; the folder dialog and the page itself were not driven; `npm --prefix planner test` -> 474 pass, 0 fail)
- [x] 4.2 Add the offer to move a `dataDir` setup into a code base (copy, then save `codeBase`, decline changes nothing). Verify in the running portal that accepting copies without overwriting, declining changes nothing, and the old folder keeps its files. (result: against a running scratch server, `POST /api/project/copy {codeBase}` -> copied 1 file, skipped 0; a second copy after editing the target -> copied 0, skipped 1 `exists`, edited file kept; `PUT {codeBase}` -> `switched:true`; old data folder still holds its file; no calls and no config change when declining; the UI was not driven; `npm --prefix planner test` -> 474 pass, 0 fail)

## 5. Skills

- [x] 5.1 Rewrite `planner/logic/skill-support/resolve-data-dir.mjs` to the new order (variable, `.plans`, config in the current folder, no climbing), read both keys, and add the "nothing found" status. Verify in `planner/test/logic/resolve-data-dir.test.mjs` for each `toolkit-story-skills` scenario, including a start in a sub-folder. (result: `node --test planner/test/logic/resolve-data-dir.test.mjs` -> 18 tests, 0 fail, one or more per `toolkit-story-skills` lookup scenario including a sub-folder start and the `.plans` literal matching `PLANS_DIR`; `npm --prefix planner test` -> 489 pass, 0 fail)
- [x] 5.2 Add the shared init function and an `init-plans.mjs` entry to `jois-story-propose`, `jois-story-review` and `jois-story-plan`, then run `node planner/scripts/sync-skill-logic.mjs`. Verify it creates only `<current folder>/.plans`, refuses a file named `.plans`, and that `planner/test/skill-sync.test.mjs` passes. (result: `node planner/scripts/sync-skill-logic.mjs` -> copies written; `node --test planner/test/logic/init-plans.test.mjs` -> tests for creating only `.plans`, a second run changing nothing, refusing a file named `.plans`, the three skill entries run from a temp folder, and explore having no init script, all passing; `node --test planner/test/skill-sync.test.mjs` -> 4 pass, 0 fail; `npm --prefix planner test` -> 489 pass, 0 fail)
- [x] 5.3 Update the data-folder text in the four `SKILL.md` files: current folder only, ask before creating, explore only reports. Verify with `node --test <abs>/toolkit/tests/story/*.test.mjs` and `python check_toolkit.py` in `toolkit/`. (result: `node --test <abs>/toolkit/tests/story/*.test.mjs` -> 364 pass, 0 fail; `python check_toolkit.py` in toolkit/ -> toolkit check passed; `npm --prefix planner test` -> 489 pass, 0 fail)

## 6. Docs and final check

- [x] 6.1 Update `CLAUDE.md`, `README.md` and `toolkit/README.md` for the `codeBase` key, `.plans/`, the current-folder-only lookup, and the note that committing `.plans/` is the code base owner's choice. Verify no doc still tells a skill to look in a parent folder. (result: Grep for parent/nearest/climb/upward across CLAUDE.md, README.md, toolkit/ and planner/ -> no remaining text tells a skill to look in a parent folder; the stale "found upward" headers in two `read-story-context.mjs` files and the `planner.config.yaml`-only headers in 7 other skill scripts were updated; no file under planner/logic/ changed, so no sync was needed)
- [x] 6.2 Verify `npm test` in `planner/` passes and `openspec validate plans-folder-in-code-base --strict` is valid. (result: `npm --prefix planner test` -> 489 pass, 0 fail; `openspec validate plans-folder-in-code-base --strict` -> change is valid)

## Workflow follow-up

- Archive `remove-write-log`, then this change, after review.
