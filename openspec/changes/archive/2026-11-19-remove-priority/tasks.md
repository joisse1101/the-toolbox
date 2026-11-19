# Tasks

Run the `npm` commands from `viewer/` and the toolkit commands from `toolkit/`, as CLAUDE.md says.

## 1. Shared model and story data

- [x] 1.1 In `viewer/shared/types.ts` remove `priority` from `Story`. In `viewer/shared/backlog/model.ts` remove `'Priority'` from `COLUMNS`, delete `PRIORITIES`, and drop `priority` from `newStory`, `storyFromCells`, `serializeBacklog` and `applyBulk` (which then takes `{ epic, feature }`). Verify: `cd viewer; npm run typecheck` reports errors only in files that later tasks change, and none in `viewer/shared/`.
- [x] 1.2 In `loadBacklog`, retire `Priority` the way `Locked` is retired: filter both legacy headers out of every row in one pass, and set `changed` when either was found. Verify: a test that loads a file with a `Priority` column holding `High` gets stories with no `priority`, `changed` true, and a serialized file without the column and with every other column unchanged; a second load of that output has `changed` false.
- [x] 1.3 Remove the "Priority is missing" warning from `storyIssues`, and `story.priority` from `viewer/shared/backlog/story-search.ts`. Verify: tests show a story with points and no priority has no warning, a story without points still has the Sprint points warning, and a search for a word that appears only in an old Priority value finds nothing.
- [x] 1.4 Update `viewer/test/shared/model.test.ts`, `review.test.ts` and `story-search.test.ts` to the new column list and to `applyBulk({ epic, feature })`, and remove the `Priority` column from `viewer/test/sample-data/sample/user-stories.csv` without changing its other columns or its LF endings. Verify: `cd viewer; node --test test/shared/model.test.ts test/shared/review.test.ts test/shared/story-search.test.ts` passes.

## 2. Portal

- [x] 2.1 In the Stories tab remove the Priority filter (`StoriesFilters.tsx`, `NO_FILTER` and the `priority` filter in `StoriesTab.tsx` and `story-table.ts`), the Priority column (`storiesColumns.ts`, `StoriesTable.tsx`), and the bulk "Set priority" control and `KEEP` sentinel (`StoriesBulkBar.tsx`, `StoriesTab.tsx`, `BulkPatch` in `useBacklog.ts`). The bulk confirmation text names only Epic and Feature. Verify: `cd viewer; npm run typecheck` passes for the frontend config and `node --test test/frontend/story-table.test.ts test/frontend/reducer.test.ts` passes after those tests drop their priority cases.
- [x] 2.2 In the story form remove the Priority select and its "Not set" note (`EstimateSection.tsx`), `'priority'` from `TextField` (`formTypes.ts`), the Alt+Right / Alt+Left jump to Priority (`storyFormNav.ts`) and its row in the shortcuts list (`useShortcuts.ts`). Sprint points keeps its own left/right stepping. Verify: `cd viewer; npm run typecheck` and `npm run build` pass, and a search for `priority` (case-insensitive) in `viewer/frontend/src/` and `viewer/shared/` finds nothing.
- [x] 2.3 Open the built portal against a mock backlog under `.scratch/` (a copy of `viewer/test/sample-data/` with a `Priority` column added back to one file), using `VIEWER_CONFIG` pointed at a scratch config. Verify by eye and in the saved file: no Priority anywhere in the Stories tab, the form or the shortcuts list, a story with no points is yellow with only the Sprint points reason, and the scratch file has lost its `Priority` column after the portal opens it.

## 3. Toolkit skills, sample and fixtures

- [x] 3.1 Remove the Priority wording from the skills and checkers: `toolkit/skills/jois-story-review/SKILL.md` (the column list, the `replace` row about missing points or priority, the Field list note, the "Ignore Priority" line) and `backlog-checks.js`; `jois-story-propose/SKILL.md` and `proposal-input.js` (the "Priority is not accepted" rule); `jois-story-explore/SKILL.md`; the Priority mention in `jois-story-plan/diagrams/source.js`; and the sentence "(not Notes or Priority)" in `viewer/shared/guidelines/diagram-conventions.md`. Keep the word "prioritised" in the INVEST text. Verify: a search for `priorit` (case-insensitive) in `toolkit/skills/` outside `lib/` and `references/` finds only the INVEST wording.
- [x] 3.2 Run `node viewer/scripts/sync-skill-logic.ts` so the `lib/` copies and the `references/` copies follow `viewer/shared/`. Verify: a second run changes no file, `git status` shows changes only in `toolkit/skills/*/lib/` and `references/`, and a search for `priorit` finds no `priority` in any `lib/` copy.
- [x] 3.3 Remove the `Priority` column from the story CSVs in `toolkit/tests/story/fixtures/habits/` and `toolkit/sample/story-to-code/stages/*/.plans/habits/` (backlog and proposals files) with a script, never by re-recording a stage, keeping LF endings and every other column. Update `toolkit/tests/story/*.test.mjs` (`backlog-checks`, `diagram-source`, `proposal-input`, `propose-skill`, `read-backlog`, `read-story-context`, `write-proposal`, `write-review`) and the line in `toolkit/sample/story-to-code/README.md` that says the writer refuses a Priority field. Verify: `node --test toolkit/tests/story/*.test.mjs` passes, including `sample-stages.test.mjs`; if that one fails because of the format, stop and ask the user before re-recording anything.

## 4. Docs

- [x] 4.1 Update `wiki/viewer/Viewer-Guide.md` (the story fields line and the Stories tab and bulk-edit paragraphs), `wiki/viewer/User-Flows.md` (step 5 of the backlog flow) and, if it still names Priority after a search, `wiki/viewer/architecture/Portal.md`, so they describe Epic and Feature bulk edit and no Priority, and say an old Priority column is dropped when the portal opens a file. Verify: `python scripts/check_docs.py` passes and a search for `priorit` in `wiki/` finds nothing.

## 5. Whole-change check

- [x] 5.1 Run the project's own test commands for the whole change and fix whatever they show. Verify: `cd viewer; npm run typecheck; npm test` and `cd toolkit; python check_toolkit.py; python -m pytest` and `node --test <abs>/toolkit/tests/story/*.test.mjs` all exit 0, and a final case-insensitive search for `priorit` outside `openspec/changes/archive/` and `openspec/specs/` finds only the INVEST wording ("prioritised").

## Workflow follow-up

- Tell the user, in the apply summary, that the portal rewrites an old file without its Priority column as soon as it opens it, and that no backup exists.
- Archive the change with `/opsx:archive` after review, which updates the main specs from the deltas.
