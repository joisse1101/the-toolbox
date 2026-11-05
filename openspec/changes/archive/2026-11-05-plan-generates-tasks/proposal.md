# Proposal

## Why

`jois-story-plan` ends at design: a use-case specification and diagrams. Nothing turns that into the work a developer does next, so nobody can tell whether a slice is built. The later apply and archive steps need a checklist to tick and to count, as OpenSpec's `tasks.md` gives them. This change adds that checklist to the plan step (issue #72).

## What Changes

- The plan skill drafts a `tasks.md` together with the slice and writes both in one write, after one review and one yes/no. The slice and its tasks are never out of step, so there is no separate "generate tasks" step and no second staleness check.
- `tasks.md` is a checklist grouped by the slice's flows. Each task has a stable task id, names the acceptance criterion (its `AC id`) and the steps it satisfies, and says how to verify it.
- Done state is the checkbox itself (`- [ ]` or `- [x]`), as in OpenSpec, so the user can tick tasks by hand and a later step can count them.
- The slice writer checks the tasks (every criterion has at least one task, every task names a real criterion and has a way to verify it) and carries ticks over from the existing `tasks.md` when the slice is redrawn. A tick is kept only while its criterion text is unchanged; otherwise it is reset and the reply says so.
- The slice read script reports the tasks of a slice: done count out of total, and tasks reset or dropped by the last redraw.
- The conventions gain a section on `tasks.md`, and the wiki pages for the plan skill are updated.

## Capabilities

### New Capabilities

- `slice-tasks`: the build-task checklist of a slice: its format, the checks the writer applies, how ticks carry over a redraw, and how the plan skill drafts and confirms it with the slice.

### Modified Capabilities

None. The slice layout, the writer and the skill's confirm flow gain behavior through the new capability, and no existing requirement text changes meaning.

## Impact

- `toolkit/skills/jois-story-plan/`: `write-diagram.mjs` and `read-diagrams.mjs` handle the extra file, a new pure module in `diagrams/` holds the task checks and the carry-over, and `SKILL.md` is updated and its version bumped.
- `planner/guidelines/diagram-conventions.md` is the source of the rules and is copied into the skill's `references/` by `planner/scripts/sync-skill-logic.mjs`.
- Tests: `toolkit/tests/story/` gains tests for the pure logic and the scripts.
- Docs: `wiki/planner/Story-Skills.md` and `wiki/planner/User-Flows.md`.
- Existing slices have no `tasks.md`. They keep working, and the next redraw writes one.
- Not in this change: the apply and archive steps that will use the ticks.
