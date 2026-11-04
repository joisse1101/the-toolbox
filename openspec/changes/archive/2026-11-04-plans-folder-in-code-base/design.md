# Design

## Context

- See `proposal.md` for why. The `remove-write-log` change lands first.
- Today the data folder comes from one config key, `dataDir`.
  - `project-config.cjs` resolves it for the portal.
  - `resolve-data-dir.mjs` resolves it for the skills. It is a generated copy in each skill and climbs to a parent folder to find `planner.config.yaml`.
- The Settings routes (`/api/project`, `check`, `init`, `copy`, `migrate`, `pick`) all work on a data folder named by `dir`.
- `confineDir` refuses a path inside the repository except `planner/data`.

## Goals / Non-Goals

**Goals:**
- A skill started in a code base folder finds `.plans/` with no setup and no climbing.
- The portal can serve `<code base>/.plans/` and can move an existing data folder into it.
- Existing `dataDir` setups and the default `planner/data/` keep working unchanged.

**Non-Goals:**
- Deciding whether `.plans/` is committed or git-ignored.
- Letting a skill create a backlog. A backlog is still created in the portal.
- Any link between `.plans/` and the wiki (#73, #75).

## Decisions

### `codeBase` is a second key, and the data folder is derived
- The data folder is `<codeBase>/.plans`. The user never types `.plans`.
- A config with both keys fails at load, naming both. This avoids a silent "which one wins".
- Alternative: replace `dataDir` with `codeBase`. Rejected: it breaks every current setup and the default `planner/data/`.

### The server derives `.plans` and reuses the folder code
- The `check`, `init` and `copy` routes and `PUT /api/project` accept a `codeBase` field. The server turns it into `<codeBase>/.plans` and runs the existing check, init, copy and switch on that folder.
- A code base gets its own confinement rule (`confineCodeBase`): absolute, existing, links resolved, no system folder, drive root, home folder or path in the repository, and `.plans` must not be a file. It has no `planner/data` exception.
- Init for a code base creates only `.plans`. The code base itself must already exist.
- Saving a code base writes `codeBase` and removes `dataDir` in one config write, so the config never holds both.

### The skill lookup stays inside the current folder
- Order: `PLANNER_CONFIG` file, then `.plans` in the current folder, then `planner.config.yaml` in the current folder.
- It never reads a parent folder. This replaces the climb for the config file, as the user required.
- `.plans` wins over a config file in the same folder. Both pointing at different places in one folder is unusual, so this is a tie-break, not a feature.
- No recognition check is made on a `.plans` folder. The earlier idea (accept it only if it holds `logs/` or a backlog) only mattered while climbing. With one folder examined, a directory named `.plans` is used as is.
- A `.plans` that is a file is reported as an error.

### Creating `.plans` is a separate, asked-for step
- `resolveDataDir` gains a status for "nothing found in the current folder". Each skill's text turns that into a question.
- Creation runs a small `init-plans.mjs` entry in `jois-story-propose`, `jois-story-review` and `jois-story-plan`, over one shared function in `planner/logic/skill-support/` that the sync script copies. It creates `<current folder>/.plans` only, and refuses if the name is taken by a file.
- `jois-story-explore` has no such script, because it never writes.
- Alternative: let each writer create `.plans` on first write. Rejected: a wrong start folder would silently get a stray folder, and `--check` would write.

### Migration is the existing copy, pointed at `.plans`
- No new migration code. The "move" offer is the existing copy step with a code base's `.plans` as its target, then a config save.
- The older-layout `Migrate` action keeps working on whatever folder is served, including `.plans`.

### One name for the folder
- `PLANS_DIR = '.plans'` lives in `backlog-paths.cjs`. The skill-side `resolve-data-dir.mjs` cannot import it, so it repeats the literal and a test checks the two match.

## Risks / Trade-offs

- [A skill started in a sub-folder finds nothing] → The message names the folder it looked in and says to start in the code base folder. This is a deliberate cost of "never leave where the user put you".
- [`.plans` committed by mistake exposes backlogs to everyone with the code base] → The README states it plainly and leaves the choice to the owner. The planner does not edit `.gitignore`.
- [Skills can create an empty `.plans` but not a backlog] → Accepted. The user creates a backlog in the portal. Revisit if it proves a dead end.
- [Both keys in a hand-edited config stop the server at startup] → The error names both keys and says to remove one.
- [The generated skill copies drift] → `planner/test/skill-sync.test.mjs` fails on any stale copy.
