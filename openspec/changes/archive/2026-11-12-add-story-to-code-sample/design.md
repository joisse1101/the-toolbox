# Design

## Context

See proposal.md for the motivation. Today the only sample data is `toolkit/tests/story/fixtures/sample/`: a two-Epic backlog, one `sign-in` slice and a context map. Five test files read it through `helpers/backlog-tree.mjs`, and their assertions name its story IDs. The planner's own `planner/test/helpers/backlog-tree.mjs` and two copies of `diagram-conventions.md` point at it by path. One of those copies, `toolkit/skills/jois-story-plan/references/diagram-conventions.md`, is generated from `planner/guidelines/diagram-conventions.md` by `planner/scripts/sync-skill-logic.mjs`, so only the planner file is edited by hand.

Three constraints shape the work:

- The story skills find their data folder in the **current folder only**: `PLANNER_CONFIG`, then `.plans/`, then `planner.config.yaml`. The mock repo must be the folder Claude starts in.
- Every file Claude creates for its own work goes under `.scratch/`, and installs stay inside the project. The mock repo therefore lives at `.scratch/mock-app/` and the toolkit goes in at project scope.
- `toolkit/` imports nothing outside itself (enforced by `planner/test/zones.test.mjs`), so the sample and its tests cannot read `planner/`.

## Goals / Non-Goals

**Goals:**
- One command rebuilds the mock repo at any stage, with no model cost.
- Each stage's saved result is a real output of the flow, so the sample shows what the skills write.
- A test with no model cost notices when a saved stage no longer passes the toolkit's checkers.

**Non-Goals:**
- A finished product. The app stays small, and unbuilt features stay on the roadmap.
- Proving that an edited skill works. A saved stage shows what the skill produced on the day it was recorded, so only a live run tests an edit.
- Cross-platform scripts. The installer is Windows PowerShell, so the sample is too.

## Decisions

### The sample is source files; the mock repo is built from them

`toolkit/sample/story-to-code/` holds files, and `build-mock-repo.ps1` copies them into `.scratch/mock-app/`, runs `git init`, switches to a branch named `sample`, installs the toolkit with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app`, and runs `npm ci` there. Alternative: commit a ready-made git repo inside the toolbox. A nested `.git` folder cannot be committed cleanly, so the script builds it instead.

### Stages hold only what each stage writes

`stages/<stage>/` holds the files that stage adds or changes, not a full copy of the project. The script applies them in order up to the stage asked for. Stages are `baseline`, `proposed`, `accepted`, `planned`, `built`, `validated` and `archived`.

```
baseline   app/ + wiki/ + CLAUDE.md                      (no .plans/)
proposed   + .plans/<backlog>/user-stories/proposals.csv
accepted   + .plans/<backlog>/user-stories.csv            (proposals moved in)
planned    + .plans/<backlog>/slices/<slice>/             (UC, tasks.md, source.json)
built      + code patch, ticks in tasks.md, review.md     (commit per group)
validated  + validation.md
archived   + wiki pages, ARCHIVED.md
```

Storing deltas keeps each stage small enough to read in a diff and shows the difference between stages, which is what explains the flow. Alternative: a full snapshot per stage. That is simpler to restore but repeats the app seven times and hides what changed.

### Built code is a patch, applied as a commit

The `built` stage holds `built.patch`, made with `git format-patch` against the baseline, and the script applies it with `git am` so the mock repo shows real commits, one per task group, as apply would have made. Alternative: a second copy of `app/` after the feature. A patch shows exactly what the feature changed and cannot drift from the baseline without failing to apply, which the staleness test then reports.

### The recorded walk builds a small feature

The walk builds streaks (a count of consecutive days a habit was checked) and nothing larger. It touches the habit list and local storage, needs no audio and no browser sound, and still exercises every stage, including validate against a running page. Category audio scapes stay on the roadmap as the larger rerun. Alternative: record the audio scapes. It is the signature feature but costs more tokens to record and adds audio code that validate cannot fully test in a browser. This choice is a default and is cheap to change before recording.

### Stage results come from a real run, and a test checks them

The recording task runs the flow once in a built mock repo and copies each stage's files into `stages/`. A new test, `toolkit/tests/story/sample-stages.test.mjs`, then runs without a model: it loads each stage's backlog with the backlog reader, checks the slice with the task and diagram checkers, checks that every story named in `source.json` exists in the backlog with a matching hash, and applies `built.patch` to the baseline in a temp copy. Alternative: trust the recording. That lets a format change silently break the sample, which is the cost this change exists to avoid.

### The old tests keep a hand-written fixture of their own

The tests that edit the exact text of a slice (a participant name, a step number, a table row) cannot read the recorded stages: the plan skill lays a slice out a little differently on every recording, and the first recording broke 67 of those assertions. So `toolkit/tests/story/fixtures/habits/` holds a hand-written backlog, slice and context map in the habit tracker domain, and the tests and both `backlog-tree.mjs` helpers read it. The recorded stages are checked only by `sample-stages.test.mjs`. The tests move to the new story IDs. One old test depends on a quirk of the old fixture: `story-ids.test.mjs` needs a stored ID (`B1-RPT-0001`) that differs from the ID the portal would derive (`B1-R-0001`). A real accepted backlog has correct IDs, so that test makes the drift itself, by replacing the ID in the loaded text as `write-freeze.test.mjs` already does. The helper `sampleTree` in `toolkit/tests/story/helpers/backlog-tree.mjs` keeps its name and shape, so the callers change little, and `planner/test/helpers/backlog-tree.mjs` is repointed the same way.

### Audio is generated, with an optional override

When the audio feature is built in a rerun, it makes white and brown noise with the Web Audio API and reads an optional `audio/` folder that `.gitignore` excludes. Recordings would add binary files and licence questions, and a rebuild would then depend on files nobody committed. The baseline has no sound, so for now this is a constraint written into the spec and the Future releases page.

### Line endings

`.gitattributes` keeps its LF pin on `toolkit/tests/story/fixtures/**` and adds one for `toolkit/sample/story-to-code/**`, because tests compare text of both with `\n`. The pin covers the whole sample, including the app source, which is harmless.

## Risks / Trade-offs

- **A saved stage goes stale when a skill's output format changes** → the staleness test fails first, and the README says to re-record then.
- **The recording costs real tokens and may not be repeatable** → it is its own task, started on purpose, and the result is committed so it is paid once. Cost is unmeasured, so the task asks the person to run `/cost` and note the figure in the README.
- **Project-scope skills may not load ahead of the global ones** (unchecked) → the recording task checks it first on a built mock repo, and if the global copy wins, the README says how to test an edited skill (a project copy needs the global copy removed or renamed, which needs the user's own approval, since it writes outside the project).
- **Moving the old tests to new story IDs risks weakening them** → each test keeps the same case it covered, and the full `node --test` suite must pass before and after.
- **Windows-only script** → accepted, matches the installer.
- **`npm ci` needs the network** → run once per build, inside the mock repo only, and `package-lock.json` is committed so the install is repeatable.

## Migration Plan

1. Build the sample (app, wiki, script) and the staleness test with placeholder stages, and repoint the old tests to a minimal hand-made backlog and slice inside the sample, so the suite is green before the old fixture goes.
2. Remove `toolkit/tests/story/fixtures/sample/` and update the references and the LF pin.
3. Record the walk and replace the placeholders with its results. This step needs the user's go-ahead.

Rollback is a revert of the commits. Nothing outside the repo changes.

## Open Questions

None that change the specs, the approach or the tasks. The sample's backlog is named `habits` with initials `H1`, so its story IDs look like `H1-HAB-0001`; renaming it later changes only those IDs.
