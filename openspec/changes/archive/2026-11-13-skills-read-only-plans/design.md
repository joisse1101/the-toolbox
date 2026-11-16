# Design

## Context

Every story script gets its data folder from `dataDirOrThrow()` in `planner/logic/skill-support/resolve-data-dir.mjs`. The sync script (`planner/scripts/sync-skill-logic.mjs`) copies that file into each skill's `lib/skill-support/`. The scripts call it only as a default argument (`dataDir = dataDirOrThrow()`) or in their command-line entry point. In-process tests pass `dataDir` directly. Tests that spawn a script as a command point it at temp data through `PLANNER_CONFIG` and a temp `planner.config.yaml` (`toolkit/tests/story/helpers/temp-config.mjs`, about 13 test files, plus two Python tests).

The planner portal reads its config through a separate module, `planner/logic/storage/project-config.cjs`, which this change leaves alone.

## Goals / Non-Goals

**Goals:**

- The resolver checks `.plans` in the current folder and nothing else.
- Spawned-script tests reach their temp data the way a user's session does: by running from a folder that holds `.plans`.

**Non-Goals:**

- Changing how the portal finds its data folder, its `PLANNER_CONFIG` variable or the config file name. These are renamed in the later planner-to-viewer move.
- Searching parent folders, or adding any other way to point a skill at a data folder.

## Decisions

### Shrink the resolver, keep its interface

`resolveDataDir({ cwd })` keeps its three result kinds, `found`, `none` and `error`, so the skills' messages and the callers need no change. `parseFlatConfig`, `readConfig` and `CONFIG_NAME` are deleted, because nothing else uses them. The `env` option goes too.

The error result's `configFile` field is renamed to `path`, because it can now only name `.plans`. Only the resolver and its test read that field.

The alternative was to keep the config lookup behind a flag for the repo's own use. We rejected it because nothing in the repo needs it once the tests run from a `.plans` folder.

### Tests run each script from a temp project folder

The helper `tempConfig(dataDir)` is replaced by `tempProject()`. It creates a temp folder with an empty `.plans` inside and returns both paths. A test builds its backlog inside that `.plans` and spawns the script with `cwd` set to the project folder.

Tests that copy fixture data copy it into `.plans` instead of naming it from a config. This covers `test_install_review_only.py`, which today points a config at the committed sample data.

We considered a junction or symlink named `.plans` pointing at the existing temp data folder. We rejected it because a Windows symlink needs extra rights, and a junction makes cleanup delete through the link.

Tests that set `PLANNER_CONFIG: ''` to switch the variable off no longer need to. A new test sets `PLANNER_CONFIG` to a valid config and checks that it is ignored, which guards the spec's scenario "The variable is ignored".

### Text that names the old places

The four `SKILL.md` files, the script header comments, the `/jois-code:archive` step and the wiki pages each list the three places today. Each changes to name only `.plans` in the current folder. Tests that assert on that text (`propose-skill.test.mjs`, `test_archive_command.py`, `allowed-tools.test.mjs`) change with it.

`allowed-tools.test.mjs` keeps its check that no text tells a session to put `PLANNER_CONFIG=` in front of a command. The check still holds and costs nothing.

## Risks / Trade-offs

- **A backlog outside `.plans` is no longer reachable from a skill.** Anyone using a plain data folder, such as `planner/data/`, must move that backlog into a code base's `.plans`. The proposal marks this as a breaking change, and the wiki says so on the Story Skills page.
- **Installed global skills keep the old resolver until the toolkit is reinstalled.** The old resolver still finds `.plans`, so mixing old and new copies does no harm.
- **A forgotten test still passes `PLANNER_CONFIG`.** It would now fail with "no data folder found" rather than pass silently, so the final test run catches it.

## Migration Plan

1. Run `node planner/scripts/sync-skill-logic.mjs` after editing the resolver, and commit the regenerated `lib/` copies in the same commit.
2. Users reinstall the toolkit to get the new skills.

To roll back, revert the commit and re-run the sync.
