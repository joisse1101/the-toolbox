# Proposal

## Why

Since #143 a story can depend on a story of another backlog, and migrating a story creates such links. The Editor shows them, but the Graph tab still looks only at the open backlog. It lists every link to another backlog as an ID "which no story has", and nothing shows which backlogs depend on each other. A migration also dismisses the migrated stories' open review suggestions, so review work is lost even though nothing about the suggestion changed.

## What Changes

- **Links to other backlogs in the Graph tab.** At the Stories level, a story of another backlog that the open backlog links to, in either direction, is drawn as a dashed node labelled with its backlog.
  - A dashed node can be selected but not opened, edited or linked from.
  - An arrow from an open-backlog story to a dashed node can be removed, because the open backlog stores it. An arrow from a dashed node cannot.
- **Other backlogs at the Features and Epics levels.** Each other backlog that the open backlog links to is one dashed node.
- **A new Backlogs level.** One node per backlog of the data folder that has a link to another backlog, an arrow per pair of linked backlogs labelled with the number of story links, and the open backlog marked. It is read-only, like Features and Epics.
- **No false "which no story has" notes.** A link to an existing story of another backlog is no longer listed as unresolved. A link with another backlog's initials that no story has still is.
- **A backlog the portal cannot read is named** under the graph, so missing dashed nodes and arrows are explained.
- **Review suggestions move with a migrated story.** Its open suggestions, split groups included, go to the target backlog's review file under the story's new ID and leave the source's review file. A group name the target already uses is renamed. The confirmation says how many suggestions move. This replaces #143's rule that dismissed them.
- **Edge cases of migration are specified and tested**:
  - two linked stories with one migrated;
  - a proposal that depends on a migrated story;
  - a link that becomes internal again;
  - both ends migrated together;
  - a story migrated out and back;
  - a frozen story whose link names a migrated story;
  - proposals and review rows in a third backlog;
  - a cycle across two backlogs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cross-backlog-links`: adds the Graph tab's view of links to other backlogs: dashed nodes at the Stories, Features and Epics levels, the Backlogs level, a cycle across backlogs, and the note for a backlog that cannot be read.
- `story-migration`:
  - "Review suggestions of migrated stories are dismissed" is removed and replaced by "Review suggestions move with their story".
  - "Migration confirmation" says how many suggestions move.
  - "Migration never loses a story" covers the target's review file.
  - "Links follow migrated stories" gains the edge-case scenarios.
- `user-story-editor`:
  - "Graph detail levels" gains the Backlogs level.
  - "Graph tolerates bad dependency data" no longer counts a link to an existing story of another backlog as unresolved.
- `portal-accessibility`: "Graph legend" explains the dashed node.

## Impact

- **Frontend graph** (`viewer/frontend/src/tools/backlog/features/graph/`):
  - `graph.ts` gets pure functions that add the other backlogs' stories as dashed items, and that group stories by backlog.
  - `GraphTab.tsx`, `GraphCanvas.tsx`, `GraphToolbar.tsx`, `GraphDetail.tsx` and `GraphUnlinked.tsx` draw dashed nodes and the Backlogs level and keep dashed nodes read-only.
  - `backlog.css` styles the dashed node.
- **Other backlogs** (`viewer/frontend/src/tools/backlog/shared/useOtherBacklogs.ts`): also returns the other backlogs' stories and the names of the backlogs it could not read. `BacklogTool.tsx` passes them to the Graph tab.
- **Migration**:
  - `viewer/shared/review/review.ts` gets a pure function that moves review rows to a new ID and renames clashing groups.
  - `useMigrateFlow.ts` writes the target's review file after the target backlog and removes the moved rows from the source's review file.
  - `useReview.ts` gets a remove call.
- **Tests**: new cases in `viewer/test/frontend/graph.test.ts`, `graph-groups.test.ts`, `viewer/test/shared/review.test.ts`, `proposals.test.ts`, `ids.test.ts` and `relink-text.test.ts`, and the server relink test for a third backlog.
- **Docs**: `wiki/viewer/Viewer-Guide.md` (Graph tab and migration), `wiki/viewer/User-Flows.md` (migration) and `wiki/viewer/architecture/Logic-Layer.md`.
- **Out of scope**:
  - Following links between two other backlogs through stories of their own at the Stories level. Only the open backlog's direct links are drawn there.
  - Creating a link to another backlog from the graph.
  - Opening another backlog from a dashed node.
