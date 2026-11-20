# Tasks

## 1. Stories of other backlogs at the Stories level

- [x] 1.1 Extend `useOtherBacklogs.ts` to return `lists` (name, initials and stories of each other backlog it read) and `unreadable` (names whose read failed), keeping `index`, `codes` and `reload` as they are (design decision 4). Verify with `npm run typecheck`.
- [x] 1.2 Add pure `withOtherStories(stories, others)` to `features/graph/graph.ts` (design decision 1). It returns the open stories plus one item per linked story of another backlog, with a negative `id`, its `backlog` and `title`, an empty `dependsOn` for a dependency, and only the open-backlog entries for a dependent. Verify with new cases in `viewer/test/frontend/graph.test.ts`:
  - a dependency and a dependent each become one item with the right arrow;
  - links between two other backlogs' stories are left out;
  - a link to an existing story of another backlog is not unresolved;
  - `B3-BIL-0099` with no such story still is;
  - a cycle through another backlog sets `cyclic`;
  - the "two linked stories, one migrated" scenario from both backlogs' side.
- [x] 1.3 Pass `lists`, `unreadable` and the open backlog's initials from `BacklogTool.tsx` to `GraphTab`. Lay out `withOtherStories` at the Stories level, and filter the unresolved note while a backlog is unreadable, as design decision 4 says. Add the note naming each unreadable backlog. Verify with `npm run typecheck` and a `graph.test.ts` case for the filter if it is a pure function.
- [x] 1.4 Make dashed nodes read-only in `GraphTab.tsx`, `GraphCanvas.tsx` and `GraphToolbar.tsx` (design decision 5):
  - selecting one highlights its links, and the hint names its backlog;
  - Open in Editor, Link and the link handle are off for it;
  - a link dropped on it is refused with a note;
  - an arrow from it cannot be removed, and the hint says which backlog stores it.

  Verify by running the portal on the sample data (`npm run build`, then `npm start`) and checking each scenario of "Dashed nodes are read-only".
- [x] 1.5 Style the dashed node in `backlog.css`: a dashed border, the backlog name in place of the epic stripe, and contrast in both themes. Add the legend entry in `GraphToolbar.tsx`, shown only when a dashed node is drawn. Verify in the running portal, in light and dark themes, against "Graph legend".
- [x] 1.6 Describe dashed nodes and the unreadable-backlog note in the Graph tab section of `wiki/viewer/Viewer-Guide.md`. Verify with `python scripts/check_docs.py`.

## 2. Other backlogs at the Features and Epics levels

- [x] 2.1 Let `groupStories` in `graph.ts` group the extra items of 1.2 under the key `\u0002<backlog>`, one group per backlog named after it (design decision 2). Verify with new cases in `viewer/test/frontend/graph-groups.test.ts`: "Epic depends on another backlog" gives an arrow weight of 2 to the `payments` group, and the group's story count is its linked stories.
- [x] 2.2 Show a backlog group as a dashed node in `GraphCanvas.tsx`. In `GraphDetail.tsx`, list an extra story by ID, Title and backlog name instead of as a button. Verify in the running portal against "Story links behind the arrow".
- [x] 2.3 Add the Features and Epics behaviour to the Graph tab section of `wiki/viewer/Viewer-Guide.md`. Verify with `python scripts/check_docs.py`.

## 3. Backlogs level

- [x] 3.1 Add pure `groupBacklogs(backlogs)` to `graph.ts`, returning items, groups, `pairs` and `mutual` in the shape `groupStories` returns (design decision 3). Verify with `graph-groups.test.ts` cases for each scenario of "Backlogs level": weights, links between two other backlogs, a backlog with no links listed as unlinked, and mutual backlogs without a cycle warning.
- [x] 3.2 Add Backlogs to `GraphLevel` and the level control. In `GraphTab.tsx`, lay it out from the open backlog's in-memory stories plus `lists`, mark the open backlog's node, and keep the level read-only, with the detail list and "Show stories" acting as at Epics level. Verify with `npm run typecheck` and in the running portal against "Graph detail levels" ("Switch to Backlogs", "Reset on another backlog").
- [x] 3.3 Describe the Backlogs level in `wiki/viewer/Viewer-Guide.md`. Verify with `python scripts/check_docs.py`.

## 4. Review suggestions move with a migrated story

- [x] 4.1 Add pure `moveReviewRows(source, target, codes)` to `viewer/shared/review/review.ts` (design decision 6). It moves the open units of the stories in `codes`, keeps each split whole, leaves applied and dismissed rows, renames a Group the target uses to the first free `<name>-<n>`, and keeps the rows' IDs as they are. Verify with new cases in `viewer/test/shared/review.test.ts`: suggestions move, split moves whole, group name already used, decided rows stay, and an empty target.
- [x] 4.2 Add `remove(indexes)` to `useReview.ts`, saving like `decide`. Verify with `npm run typecheck`.
- [x] 4.3 Change `useMigrateFlow.ts` to the write order of design decision 7:
  - read the target's review file with the target backlog;
  - count the moving rows in the confirmation;
  - write the target's review file after the target backlog, and stop with the "now in both backlogs" message if that fails;
  - remove the moved rows from the source review instead of dismissing them.

  Verify with `npm run typecheck`, and in the running portal on a temp copy of the sample data: migrate a story with open suggestions, then check that both review files match "Suggestions move" after the note shows.
- [x] 4.4 Regenerate the toolkit's copies of `review.ts` with `node viewer/scripts/sync-skill-logic.ts`. Verify that `git diff --stat toolkit/skills` lists only `lib/review/review.mjs` copies and that each gained only `moveReviewRows`.
- [x] 4.5 Update the migration sections of `wiki/viewer/Viewer-Guide.md` and `wiki/viewer/User-Flows.md`, and add `moveReviewRows` to `wiki/viewer/architecture/Logic-Layer.md`. Verify with `python scripts/check_docs.py`.

## 5. Migration edge cases

- [x] 5.1 Add a test helper in `viewer/test/shared/` that runs a migration as the flow does: `loadBacklog`, `migrateStories`, `idChanges` with the forwards, `relinkStories` for the source's proposals, `moveReviewRows`, and the `relink*Text` functions for every other backlog's files (design decision 8). Verify that a plain migration test through the helper passes.
- [x] 5.2 Add one test per edge-case scenario of "Links follow migrated stories" on the helper:
  - proposal follows the story;
  - link becomes internal again;
  - both ends migrated together;
  - migrated out and back;
  - frozen dependent follows;
  - third backlog follows.

  Verify that each test fails if its expected ID is changed by hand, then passes as written.
- [x] 5.3 Add a test that moved review rows land on the new IDs after the source save's relink, including a `Depends On` row that names a source story renumbered by the migration. Verify with the helper of 5.1.
- [x] 5.4 Add a case to `viewer/test/backend/server-relink.test.ts` for a third backlog's proposals and open review rows naming a migrated story, on a temp copy of the sample data. Verify that the case passes and the dismissed rows are unchanged.

## 6. Whole-change check

- [x] 6.1 Run the project's test commands for the whole change and fix every failure they report.
  Verify: `npm run lint`, `npm run typecheck` and `npm test` from `viewer/`, `node --test toolkit/tests/story/*.test.mjs`, and `python scripts/check_docs.py` all exit 0.
