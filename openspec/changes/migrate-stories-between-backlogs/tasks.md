# Tasks

## 1. Shared ID-change logic

- [x] 1.1 Add `idChanges(before, after)` to `viewer/shared/backlog/ids.ts`: `recodedBetween` plus a `''` entry for each story with a unique code that is gone (design decision 1). Verify with new cases in `viewer/test/shared/ids.test.ts`: renumbered, deleted, duplicate code left out, and unchanged list gives an empty map.
- [x] 1.2 Add pure `relinkStories(stories, changes)` in `viewer/shared/backlog/ids.ts`: rewrite each `Depends On` entry that exactly matches a key, drop `''` entries, de-duplicate, and return the same array when nothing changes. Verify with `ids.test.ts` cases, including the swap A to B and B to A applied once.
- [x] 1.3 Make `loadBacklog` in `viewer/shared/backlog/model.ts` also return the story list as parsed before its renumber (same in-memory `id`s), so a baseline can be taken on open. Verify with a test that a file with reordered rows yields an `idChanges` map naming the renumbered IDs.
- [x] 1.4 Add text-level helpers that parse, relink and serialize a backlog CSV, a proposals CSV and a review CSV, using `relinkStories` and `retargetRows`. Each returns `null` when the text would not change. Verify with tests on copies of `viewer/test/sample-data/` files, including a review file whose dismissed rows stay unchanged.
- [x] 1.5 Describe `idChanges`, `relinkStories` and the text helpers in `wiki/viewer/architecture/Logic-Layer.md`. Verify with `python scripts/check_docs.py`.

## 2. Server relink endpoint

- [x] 2.1 Add `POST /api/relink` to `viewer/backend/server.ts` with body `{ from, changes, only? }` (design decision 3). Validate the body at entry and answer 400 on a bad shape. For each backlog of the data folder except `from` (limited to `only` when given), rewrite its three files with the 1.4 helpers. Write only the files that change, atomically. Take part in the same busy lock as the other writes. Answer `{ updated, failed: [{ name, file, message }] }`. Verify with a new `viewer/test/backend/server-relink.test.ts` on a temp copy of the sample data: links rewritten in the stories, proposals and review of another backlog, `from` untouched, an untouched backlog not written, a bad body refused, and `only` honoured.
- [x] 2.2 Report a file that cannot be written (simulate a lock, as the existing server tests do) in `failed` while the other backlogs are still updated. Verify with a case in `server-relink.test.ts`.
- [x] 2.3 Document the endpoint in the File API section of `wiki/viewer/architecture/Portal.md`. Verify with `python scripts/check_docs.py`.

## 3. Saves carry their ID changes

- [x] 3.1 Add `relink(from, changes, only?)` to `viewer/frontend/src/shared/api/files.ts`, typed by a reply interface shared with the server's answer. Verify with `npm run typecheck`.
- [x] 3.2 Add a pure relink queue module in `viewer/frontend/src/shared/lib/`. It holds jobs in order, runs one at a time, narrows a failed job to its failed backlogs, and never re-runs a done backlog (design decision 4). Verify with a new `viewer/test/frontend/relink-queue.test.ts` using a stubbed `relink`: order kept, retry only the failures, later jobs wait.
- [x] 3.3 Extend `useAutosave.ts`:
  - Keep a baseline of the stories on disk. Set it on load from 1.3 and after each successful write.
  - Compute `idChanges(baseline, current)` merged with registered forwards before each write.
  - Enqueue a non-empty list after the write succeeds and call an `onIdChanges` callback with it.
  - Keep the status saving or failed until the queue is empty, and make `settle()` and the page-close warning wait for it.

  Verify with `npm run typecheck` and a manual check: drag a story in one backlog of a mock data folder under `.scratch/`, then confirm another backlog's link followed.
- [x] 3.4 In `BacklogTool.tsx`, wire `onIdChanges` to `review.retarget` and to a `relinkStories` pass over the in-memory proposals. Remove the scattered `review.retarget` calls after move, group move and Renumber, and keep only the placeholder mapping in `useProposedFlow.ts` (design decision 5). Verify with `npm run typecheck` and a manual check that an open suggestion still follows its story after a drag and after a delete.
- [x] 3.5 Update "Story IDs, dependencies and frozen stories" in `wiki/viewer/Viewer-Guide.md`. It should say that links may name stories of other backlogs, that every save updates them, and that a locked file keeps the save chip on failed. Verify with `python scripts/check_docs.py`.

## 4. Frozen stories cannot be ticked

- [x] 4.1 In `StoriesTable.tsx`, disable a frozen story's checkbox with the hint "A frozen story cannot be changed in bulk". In `StoriesTab.tsx`, filter frozen IDs out of `tick` ranges and out of select-all, and count the header checkbox as fully ticked when every non-frozen row shown is ticked. Put the filtering in a pure helper in `story-table.ts`. Verify with cases in `viewer/test/frontend/story-table.test.ts`: a range over a frozen row, select-all with frozen rows, and every row frozen.
- [x] 4.2 Prune frozen stories from `checked` in `useBacklog.ts` whenever the stories change. Verify with `npm run typecheck` and a manual refresh after setting `Frozen` to `Yes` in a mock CSV under `.scratch/`.
- [x] 4.3 Remove the frozen "skipped" and "kept" messages from bulk edit and Delete selected in `StoriesTab.tsx`, and the frozen note from the Delete button's title in `StoriesBulkBar.tsx`. Keep the shared functions' frozen guards. Verify with `npm run typecheck` and that no "frozen" string remains in those two files' messages.
- [x] 4.4 Update the Stories tab section of `wiki/viewer/Viewer-Guide.md` to say that frozen stories cannot be ticked. Verify with `python scripts/check_docs.py`.

## 5. Migration logic

- [x] 5.1 Add `migrateStories({ source, target, ids, sourceInitials, targetInitials })` to `viewer/shared/backlog/proposals.ts`, following design decision 6:
  - Refuse a frozen story or a story without an ID.
  - Take the stories out and renumber the source.
  - Rewrite the source's links to moved stories to their target codes.
  - Merge the headers.
  - Place each copy after the last story of its Epic, or at the end, and renumber the target.
  - Leave the moved stories' links to source stories on their pre-migration IDs.
  - Return `{ source, target, targetHeaders, forwards, recoded }` or `{ error }`.

  Verify with new cases in `viewer/test/shared/proposals.test.ts`: joins an existing Epic, starts a new Epic, keeps relative order, fields and unknown columns moved, column added to the target, frozen refused, a frozen ID in the source kept, the target's existing IDs unchanged, and forwards correct.
- [x] 5.2 Add an end-to-end case in `viewer/test/shared/proposals.test.ts`. It applies the source save's list (`idChanges` merged with forwards) to the target through `relinkStories`, and checks that every link in both backlogs names the intended story with no double shift.

## 6. Migrate in the Stories tab

- [x] 6.1 Add **Migrate (N)** to `StoriesBulkBar.tsx`. Disable it when no ticked row is shown or the data folder has no other backlog, with a hint saying which. Verify with `npm run typecheck` and a manual check in a mock data folder with one backlog and then two.
- [x] 6.2 Add a target-backlog dialog in `viewer/frontend/src/tools/backlog/features/stories/`. It lists the other backlogs by name and initials, its Migrate button stays disabled until one is chosen, and Cancel changes nothing. Follow the existing dialog components and the `jois-design-ui-principles` skill. Verify with `npm run build` and a manual check.
- [x] 6.3 Add `useMigrateFlow.ts` in the Stories feature with the order of design decision 7: settle, read the target, `migrateStories`, confirm with the count of dismissed suggestions, write the target (stop on failure), register forwards, replace the source stories, and dismiss the moved stories' open review rows. Show the result in the bulk bar note. Verify manually in a mock data folder under `.scratch/` with three backlogs:
  - Links across backlogs follow, and no link is double-shifted.
  - With the target CSV open in Excel, nothing changes and the message names the file.
  - With a third backlog's CSV open in Excel, the save chip shows failed and recovers once it is closed.
- [x] 6.4 Document Migrate in the Stories tab section of `wiki/viewer/Viewer-Guide.md`, and add a migration routine to `wiki/viewer/User-Flows.md`. Verify with `python scripts/check_docs.py`.

## 7. Whole-change check

- [x] 7.1 Run the project's checks for the whole change and fix any failure: `npm run typecheck`, `npm test` and `npm run build` from `viewer/`, and `python scripts/check_docs.py`. Verify: every command exits with code 0.
