# Tasks

## 1. Resolver reads only .plans

- [x] 1.1 In `planner/logic/skill-support/resolve-data-dir.mjs`, make `resolveDataDir({ cwd })` check only `<cwd>/.plans` (found, `.plans` is a file, unreadable, none). Delete `parseFlatConfig`, `readConfig`, `CONFIG_NAME` and the `env` option, and rename the error result's `configFile` to `path`. Rewrite the header comment and both `dataDirOrThrow` messages so they name only `.plans` in the current folder. Verify: `grep -n "PLANNER_CONFIG\|planner.config" planner/logic/skill-support/resolve-data-dir.mjs` prints nothing.
- [x] 1.2 Rewrite `planner/test/logic/resolve-data-dir.test.mjs` to the spec scenarios in `specs/toolkit-story-skills/spec.md`: `.plans` found, variable ignored, variable alone finds nothing, config file alone finds nothing, sub-folder finds nothing, the message names only `.plans`, and `.plans` is a file. Drop the `parseFlatConfig` and config-precedence tests. Verify: `cd planner; node --test --import ./test/setup.mjs test/logic/resolve-data-dir.test.mjs` passes.
- [x] 1.3 Run `node planner/scripts/sync-skill-logic.mjs` to regenerate `toolkit/skills/*/lib/skill-support/resolve-data-dir.mjs`. Verify: `git diff --stat toolkit/skills` lists only the four `lib/skill-support/resolve-data-dir.mjs` copies, and `cd planner; node --test --import ./test/setup.mjs test/skill-sync.test.mjs` passes.

## 2. Toolkit story tests run from a .plans folder

- [x] 2.1 Replace `toolkit/tests/story/helpers/temp-config.mjs` with a `tempProject()` helper that creates a temp folder holding an empty `.plans` and returns `{ cwd, dataDir }`, as `design.md` describes. Verify: no file under `toolkit/tests/story/` imports `temp-config.mjs`.
- [x] 2.2 In each spawned-script test (`context-map-scripts`, `diagram-scripts`, `read-story-context`, `story-ids`, `suggest-lexicon`, `verify-skill`, `write-freeze`, `write-lexicon`, `write-proposal`, `write-review`), build the backlog inside the helper's `.plans` and spawn with `cwd` set to its project folder instead of setting `PLANNER_CONFIG`. Turn the existing "no config" cases into a run from a folder without `.plans`. Verify: `grep -rln "PLANNER_CONFIG\|planner.config" toolkit/tests/story` lists only `allowed-tools.test.mjs`, plus the one new test from 2.3.
- [x] 2.3 Add one spawned-script test that sets `PLANNER_CONFIG` to a valid config naming another data folder and checks that the script uses the current folder's `.plans` (spec scenario "The variable is ignored"). Verify: the test fails against the old resolver (check out the old copy into a temp folder and run it) and passes against the new one.
- [x] 2.4 Change `toolkit/tests/test_install_review_only.py` to copy `SAMPLE_DATA` into `<project>/.plans` and run the scripts with `cwd=project` and no `PLANNER_CONFIG`. Verify: `cd toolkit; python -m pytest tests/test_install_review_only.py` passes, using the toolkit's `.venv` as the local-install rule says.

## 3. Skill text and docs name only .plans

- [ ] 3.1 Rewrite the data-folder paragraph in the `SKILL.md` of `jois-story-explore`, `jois-story-propose`, `jois-story-review` and `jois-story-plan` so it names only `.plans` in the current folder, and drop the advice to set `PLANNER_CONFIG`. Change `propose-skill.test.mjs` line 143 to assert the text does not mention `PLANNER_CONFIG`. Verify: `grep -rn "PLANNER_CONFIG\|planner.config" toolkit/skills --include=SKILL.md` prints nothing.
- [ ] 3.2 Update the header comments of the story scripts (`read-story-context.mjs` in explore and propose; `read-context-map`, `read-diagrams`, `write-context-map`, `write-diagram`, `write-freeze` in plan; `suggest-lexicon`, `write-lexicon`, `write-proposal` in propose) to say the data folder is `.plans` in the current folder. Verify: `grep -rn "PLANNER_CONFIG\|planner.config" toolkit/skills --include=*.mjs | grep -v /lib/` prints nothing.
- [ ] 3.3 In `toolkit/commands/jois-code/archive.md` step 2, name only `.plans` as the place the scripts look. Change `test_archive_command.py` so it asserts `.plans` is named and `PLANNER_CONFIG` and `planner.config.yaml` are not. Verify: `cd toolkit; python -m pytest tests/test_archive_command.py` passes.
- [ ] 3.4 Update `wiki/planner/Story-Skills.md`, `wiki/planner/architecture/Story-Skills-Internals.md` ("Where the data folder comes from") and `wiki/Story-To-Code.md` to name only `.plans`. Story-Skills.md also says that a backlog in a plain data folder must move into a code base's `.plans` to be used by a skill. Verify: `python scripts/check_docs.py` passes.
- [ ] 3.5 Test the edited skills live in the sample's mock repo, as CLAUDE.md says. Build it with `toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage proposed -Reset`, then reinstall the four skills at project scope with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill <name> -Force`. Check that the session loads the project copies, not global ones. From `.scratch/mock-app/`, run `node .claude/skills/jois-story-review/read-backlog.mjs habits`; it reads the backlog. Run it again from a sub-folder, and again with `PLANNER_CONFIG` set and no `.plans`; each time it reports no data folder and names only `.plans`. Then run `jois-story-explore` headless in `.scratch/mock-app/`, with the answers in the prompt. Verify: the explore run finds the `habits` backlog, and the three script runs behave as stated.

## 4. Whole-change test run

- [ ] 4.1 Run every test suite the project names and fix any failure this change caused. Verify: `cd planner; npm test`, `node --test <abs>/toolkit/tests/story/*.test.mjs`, `cd toolkit; python check_toolkit.py; python -m pytest` (through the toolkit's `.venv`) and `python scripts/check_docs.py` each exit 0.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review. This syncs the delta into `openspec/specs/toolkit-story-skills/spec.md`.
- Propose the next change in the series: rename and move `planner/` to `viewer/`.
