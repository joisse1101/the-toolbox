# Proposal

## Why

The Priority field is not used by anyone, yet every story carries it and the tool nags about it: a story with no Priority gets a yellow row and a "Priority is missing" warning. It also costs screen space (a filter, a table column, a form control, a bulk-edit control, a keyboard shortcut) and extra rules in the skills ("Priority is not accepted", "ignore Priority"). Removing it makes the format and the portal simpler.

## What Changes

- **BREAKING (file format):** the story CSV no longer has a `Priority` column. The columns become `ID, Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria, Notes, Frozen, Clarifications`.
- An old file that still has a `Priority` column is cleaned on load the way the old `Locked` column was: the column is dropped, and the file is marked as changed so the portal saves it without the column. The old values are not kept.
- The "Priority is missing" warning is removed. A story with no Sprint points still gets its yellow warning.
- The Stories tab loses the Priority filter, the Priority column and the bulk "Set priority" control. Bulk edit covers only Epic and Feature.
- The story form loses the Priority select, its "Not set" note and the Alt+Right / Alt+Left shortcut that jumped to it. Sprint points keeps its own arrow-key stepping.
- Story search no longer matches on priority.
- The skills stop mentioning Priority: the "Priority is not accepted" and "ignore Priority" rules, and the proposal writer's "Priority refused" error, are removed. A `Priority` field in a proposal input becomes an ordinary unknown field.
- The story files in the sample, the test fixtures and the wiki pages are updated to the new column list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: the story fields, the completeness warnings, the Stories tab, multi-select, bulk edit, the shortcuts and the CSV column list lose Priority.
- `frozen-stories`: the bulk-edit scenario for frozen stories no longer uses Priority.
- `story-proposal-writer`: the "Priority refused" scenario and the patch scenario that names `priority` are removed.
- `backlog-review-skill`: the "Priority is ignored" scenario is removed.
- `backlog-review-suggestions`: the Field list and the "value only the user can decide" rule no longer mention Priority.
- `backlog-consistency-checks`: the "Priority SHALL NOT be checked" sentence is removed.
- `story-writing-skills`: the "SHALL NOT set Priority" sentence is removed.

## Impact

- `viewer/shared/` (`backlog/model.ts`, `backlog/story-search.ts`, `types.ts`): column list, `PRIORITIES`, parse, serialize, `storyIssues`, bulk edit, search.
- `viewer/frontend/src/tools/backlog/`: Stories tab (filters, table, columns, bulk bar, `story-table.ts`), story form (`EstimateSection.tsx`, `formTypes.ts`, `storyFormNav.ts`), `useBacklog.ts`, `useShortcuts.ts`.
- `toolkit/skills/`: the four generated `lib/backlog/model.mjs` copies and the two `story-search.mjs` copies (regenerated with `viewer/scripts/sync-skill-logic.ts`), `jois-story-review` and `jois-story-propose` (`SKILL.md`, `backlog-checks.js`, `proposal-input.js`), `jois-story-explore` `SKILL.md`, and the copied `references/*.md`.
- Tests and data: `viewer/test/` (model, review, reducer, story-table, search, sample data), `toolkit/tests/story/` (fixtures and tests), `toolkit/sample/story-to-code/` stage CSVs.
- Docs: `wiki/viewer/User-Flows.md`, `wiki/viewer/Viewer-Guide.md`, `wiki/viewer/architecture/Portal.md`.
- Existing user backlogs are rewritten without the column as soon as the portal opens them (a load that changes the file counts as an edit, so auto-save runs). The portal keeps no backup, so the old Priority values are gone unless the user has a copy of the data folder.
