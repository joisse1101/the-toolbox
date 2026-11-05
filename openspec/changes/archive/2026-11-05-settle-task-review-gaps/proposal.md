# Proposal

## Why

The last change taught the plan skill to list, in its review reply, what the tasks leave out. A manual run on the sign-in slice showed three places where the rule is not precise enough to apply the same way twice. A failure path that is drawn and tabled but has no failure criterion never shows up in the list, so a slice can be ticked complete with the bad-path behavior unbuilt. The words "covered" and "depends on" have no definition, so two runs can disagree on whether a rule is covered or a task depends on an unfinished decision.

## What Changes

- The review reply also lists each failure response of the document that has no failure criterion and no task naming it. A failure response is a row of `## Failure responses` whose `AC id` row is on the main path.
- A rule or failure response counts as covered when some task's `Verify:` line names it. Otherwise it is listed as not covered.
- A task depends on a `TBC` design decision when the decision's `Steps` cell lists a step the task cites, and must name the decision id in its `Verify:` line. An open question that names a decision id inherits that dependency. Any other open question is listed in the review reply and needs no mention in a Verify line.
- The three definitions are written once in section 10 of the conventions, and the skill text points to them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plan-stories-skill`: adds the failure-response gap to the review reply, and defines when a rule counts as covered and when a task depends on a `TBC` decision or an open question.

## Impact

- `planner/guidelines/diagram-conventions.md` (section 10), copied into the skill's `references/` by `planner/scripts/sync-skill-logic.mjs`.
- `toolkit/skills/jois-story-plan/SKILL.md`, with a patch version bump.
- Tests: `toolkit/tests/story/plan-skill.test.mjs`.
- Docs: `wiki/planner/Story-Skills.md`.
- No writer, reader or parser code changes, and no slice on disk is affected.
- Builds on `sharpen-task-drafting`, which introduced the review reply list. If that change is not archived first, the two deltas still sync independently, because this one only adds requirements.
