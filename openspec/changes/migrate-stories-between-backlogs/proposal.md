# Proposal

## Why

A project often has more than one backlog, and a story sometimes turns out to belong in another one. Today the only way to move it is to retype it there and delete the original, which loses its ID history and breaks every `Depends On` link that named it. Links between backlogs also go stale whenever a backlog renumbers, because renumbering rewrites links only inside its own backlog.

## What Changes

- The Stories tab's bulk bar gets a **Migrate** button. It opens a dialog that lists the other backlogs of the same data folder. Choosing one moves the ticked stories there.
- A migrated story goes after the last story of its epic in the target backlog, or starts a new epic at the end. It takes the target's initials. Both backlogs are renumbered.
- The open review suggestions of a migrated story are dismissed, after a confirmation that names how many.
- A column the source backlog uses and the target lacks is added to the target, so no cell is lost.
- **Links between backlogs never go stale.** Every save of a backlog carries the list of story IDs that changed since the last save, old ID to new ID, or to nothing for a deleted story. The server rewrites those IDs in every other backlog of the data folder. That covers its stories' `Depends On`, its proposals' `Depends On` and its open review suggestions. The open backlog's own proposals and review follow the same list in memory. This works because every ID starts with its backlog's initials, which are unique in the data folder.
- A save is shown as failed until every other backlog has been updated, and the portal retries only the backlogs that failed.
- A migration writes the open backlog and updates the other backlogs at once, as part of the action, so closing the page right after it leaves no backlog behind.
- **Links between backlogs are shown, not flagged.** The Editor shows a link to another backlog's story with its Title and backlog name, and a story's Required by also lists stories of other backlogs that depend on it. Neither the portal nor the review skill's consistency checks report such a link as a story that does not exist. Without this, a migration keeps the links on disk but the portal shows them as broken.
- **BREAKING (portal behaviour):** a frozen story's tick box in the Stories tab is disabled. Select-all and shift-click skip frozen stories. Bulk edit, Delete selected and Migrate therefore never see a frozen story, and the "n frozen stories were skipped" messages are removed.

## Capabilities

### New Capabilities

- `story-migration`: moving stories from one backlog to another of the same data folder from the Stories tab. Covers the Migrate button and dialog, where the stories land, their new IDs, the column merge, review suggestions, and the order the files are written in.
- `cross-backlog-links`: `Depends On` links that name a story in another backlog of the same data folder, how they are kept pointing at the same story when that backlog's IDs change, and how the Editor, Required by and the consistency checks treat them. The later change that shows these links in the graph will extend this capability.

### Modified Capabilities

- `frozen-stories`: "A frozen story is read-only" says a frozen story cannot be ticked in the Stories tab, so bulk actions never reach it. The "Bulk edit skips it" scenario is replaced.
- `user-story-editor`: these three requirements drop frozen stories from the selection instead of skipping them, along with their "skipped" messages:
  - "Multi-select in the Stories tab"
  - "Delete selected unfrozen stories"
  - "Bulk edit selected unfrozen stories"

## Impact

- **Shared logic** (`viewer/shared/backlog/`):
  - A new pure migration function, beside `moveToProposed` in `proposals.ts`.
  - A version of `recodedBetween` that also reports deleted stories.
  - A relink function for each file kind that holds story IDs: backlog, proposals and review.
- **Backend** (`viewer/backend/server.ts`): a new `POST /api/relink` endpoint. It rewrites IDs in every backlog of the data folder except the one named, and reports the backlogs it could not write. The existing file routes are unchanged.
- **Frontend**:
  - `viewer/frontend/src/shared/hooks/useAutosave.ts` keeps the stories last written to disk and sends the list of changed IDs after each successful write.
  - `viewer/frontend/src/shared/api/files.ts` gets the call for the new endpoint.
  - The Stories feature gets the Migrate button and dialog, and stops frozen stories from being ticked.
  - The scattered `review.retarget` calls in `BacklogTool.tsx` and `useProposedFlow.ts` are replaced by the single list sent with each save.
  - `BacklogTool.tsx` reads the other backlogs of the data folder into a read-only index. `DependenciesSection.tsx` uses it to label links to other backlogs and to fill Required by across backlogs.
- **Shared checks**: `backlogProblems` in `viewer/shared/backlog/ids.ts` accepts the codes of other backlogs and does not flag them as missing.
- **Toolkit**: `toolkit/skills/jois-story-review/read-backlog.mjs` passes the other backlogs' codes to its consistency checks, so a review never suggests removing a link to another backlog.
- **Docs**: `wiki/viewer/Viewer-Guide.md` (Stories tab, and story IDs and dependencies), `wiki/viewer/User-Flows.md` and `wiki/viewer/architecture/Logic-Layer.md`.
- **Out of scope**:
  - Drawing links between backlogs in the Graph tab. A later change handles it.
  - Story skills that write a new link to another backlog, such as `jois-story-propose`.
  - IDs typed by hand outside the portal, for example in Excel, are not followed.
