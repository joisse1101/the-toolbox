# Proposal

## Why

A reliability test of the plan skill's `tasks.md` step ran six independent drafts from three mock slices. All six passed the writer's check on the first attempt, so the format is reliable. Two judges then found the same quality gaps: Verify lines that drop a step or input the task cites, open questions and TBC items that no task mentions, rules outside the criteria that nothing builds or reports, and loose step citations. The drafters also reported six points where the skill text left them guessing, which explains why two runs of one slice differ in task count. The archive step will trust a ticked task to mean "built and verified", so a weak Verify line lets unbuilt work be ticked.

## What Changes

- The plan skill's drafting rules say what a good task is: one task per criterion by default, a split only along participants or phases, a failure criterion never folded into a main-path task, and steps copied from the criterion's own row.
- A Verify line must name an input and an observable result for every step its task cites, and say how to reach a state it needs (an overdue loan, a shipped order).
- A task that depends on a TBC row or an open question says so in its Verify line.
- The skill's review reply lists the rules and TBC items it did not turn into tasks, so the user sees what is left out.
- Section 10 of the conventions settles the six unclear points to match what the writer already accepts: an optional `# Tasks` title line, blank lines between tasks, bare step ids, the story Title optional in a task, and steps pooled for a task that names several criteria.
- Tests pin those accepted forms, so the parser cannot change them by accident.
- No new writer check. A step-coverage check was considered and left out until there is evidence it does not reject good drafts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `slice-tasks`: adds the accepted layout forms (title line, blank lines, bare step ids) and the rule for steps when a task names several criteria.
- `plan-stories-skill`: adds how the skill drafts tasks (granularity, Verify content, flagging open items) and what it reports to the user about what it left out.

## Impact

- `planner/guidelines/diagram-conventions.md` (section 10), copied into the skill's `references/` by `planner/scripts/sync-skill-logic.mjs`.
- `toolkit/skills/jois-story-plan/SKILL.md`, with a patch version bump.
- Tests: `toolkit/tests/story/tasks-parse.test.mjs` and `plan-skill.test.mjs`.
- Docs: `wiki/planner/Story-Skills.md`.
- No change to `write-diagram.mjs`, `read-diagrams.mjs` or `diagrams/tasks.js` behavior, and no slice on disk is affected.
