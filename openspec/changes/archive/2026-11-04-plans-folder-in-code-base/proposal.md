# Proposal

## Why

A story skill run inside a code base cannot tell where that code base's backlog files are. It has to be told, by the `PLANNER_CONFIG` variable or a `planner.config.yaml`, and the files live in a private folder away from the code they describe. If the planner keeps them in a fixed place inside the code base, `<code base>/.plans/`, a skill started in that folder finds them with no setup. This is GitHub issue #76.

## What Changes

- The planner config accepts a new `codeBase` key. The data folder is then `<codeBase>/.plans/`.
  - `dataDir` still works. With neither key, the data folder is still `planner/data/`.
  - A config that sets both keys is refused at load.
- `<code base>/.plans/` has the same layout a data folder has today, so readers and writers need no change.
- A story skill looks for its data folder in the current folder only and never in a parent folder.
  - Order: the file `PLANNER_CONFIG` names, then `.plans/` in the current folder, then `planner.config.yaml` in the current folder.
  - If none is found, the skill says so and asks before creating `.plans/` in the current folder. `jois-story-explore` only reports it, because it never writes.
  - This replaces today's climb to a parent folder for `planner.config.yaml`.
- The Settings tab chooses a code base. Init creates `.plans/` in it.
- A setup that uses `dataDir` is offered a move: copy its data into the code base's `.plans/` without overwriting a file, then switch the config to `codeBase`. Declining changes nothing.
- The server confines a code base the same way it confines a data folder, with no exception for `planner/data`.
- Specs, `CLAUDE.md`, the READMEs and the four skills' text describe the new location.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-config`: the `codeBase` key, `.plans/` as the derived data folder, init of `.plans/`, the Settings tab's code-base choice, the move offered to `dataDir` setups, and confinement of a code base.
- `toolkit-story-skills`: the data-folder lookup becomes current-folder-only with `.plans/` first, and a skill asks before creating `.plans/`.
- `backlog-folder-layout`: states that `.plans/` of a code base holds the same layout as a data folder.

## Impact

- **Depends on** the `remove-write-log` change landing first: init no longer creates `logs/`, and no write log lands in a committed `.plans/`.
- Code: `planner/logic/storage/project-config.cjs`, `project-folders.cjs`, `planner/logic/skill-support/resolve-data-dir.mjs` (and its generated copies), `planner/portal/server/server.cjs`, the Settings tab and `useSettings.js`, a new `init-plans.mjs` entry in the skills that write.
- Docs: `CLAUDE.md`, `README.md`, `toolkit/README.md`, `planner/planner.config.example.yaml`, the four `SKILL.md` files.
- Security: `.plans/` in a code base is visible to everyone with that code base, and is in its history if committed. The planner does not decide whether `.plans/` is committed or git-ignored. This is the code base owner's choice and is stated in the README.
- Related, not decided here: #73 (archive slices into the wiki) and #75 (read archived wiki docs).
