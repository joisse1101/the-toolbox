## Why

`jois-story-plan` knows two situations: no code (every code-bound section reads `TBC` and no file path may appear) and code that exists (every traceability row names a file the skill read). A story that builds the code from scratch fits neither, because it has no code to read but must name the files it will create. In a real session the writer rejected the build plan with "must read TBC without a repo", the message pointed to no way forward, and the skill offered a workaround that dropped part of the task.

## What Changes

- Add a third mode, **greenfield**, to the conventions: the code does not exist yet and the slice describes how to build it.
- The document declares the mode in its `Maturity` row as `planned (greenfield)`; the writer reads it from there, so `--check` and the write cannot disagree and no new command flag is added.
- In greenfield mode `## Implementation overview` holds the build plan, and each `## Traceability` row names a `file::symbol` that is marked `planned`.
- A planned path is allowed only when a `user-confirmed` row of `## Design decisions` records the project layout or stack; a decision with source `repo` stays invalid, because nothing was read.
- Add a mode question to `SKILL.md`: when the current folder holds little or no code for the flow, ask once whether the story builds the code or describes code that exists, and pick the mode from the answer.
- Make the writer's `TBC` and file-path errors say that a story which builds the code from scratch uses greenfield mode, and name the conventions section.
- Add one line to `SKILL.md`: when a writer rejects something, read the conventions section it names before proposing a workaround.
- Bump the skill version.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagram-conventions`: the "Limits without a repo" requirement gains the greenfield mode and its row rules.
- `diagram-writer`: validation accepts greenfield documents and its error text names the greenfield mode.
- `plan-stories-skill`: a new requirement for the mode question, and the "Design level without a repo" requirement is narrowed to the describe-only case.

## Impact

- `toolkit/skills/jois-story-plan/references/diagram-conventions.md` (sections 4 and 5), `SKILL.md`, `diagrams/checks.js` (`checkSpec`), and the matching tests under `toolkit/tests/story/` (`diagram-checks.test.mjs`, `plan-skill.test.mjs`) and fixtures.
- No change to `planner/`, to the backlog files, or to the `--repo` flag, which keeps meaning "the skill read the code".
- Not in scope: a slice that mixes existing and planned code (it would need a per-row marker), and judging whether a planned path is sensible (the writer checks format only, as it does for `--repo`).
