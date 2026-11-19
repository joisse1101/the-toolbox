# Design

## Context

See proposal.md for the motivation. The requirements are in the four delta specs: `story-migration`, `cross-backlog-links`, `frozen-stories` and `user-story-editor`.

The portal has one backlog open at a time. Its autosave (`viewer/frontend/src/shared/hooks/useAutosave.ts`) writes the whole CSV with `PUT /api/backlog/<name>`, keeps the last text it wrote, and retries a failed write. Every other backlog lives only on disk.

Story IDs are recomputed from position by `renumber` in `viewer/shared/backlog/ids.ts`. `recodedBetween(before, after)` already gives the old-to-new IDs of the stories, matched by their in-memory `id`. Today that list feeds only `review.retarget`, which is called after drag, group move, Renumber and Move to Proposed, but not after delete, add, accept, initials or load.

`moveToProposed` and `acceptProposed` in `viewer/shared/backlog/proposals.ts` are the existing moves between two story files. Migration follows their shape.

Three kinds of file hold story IDs:

- `user-stories.csv` holds them in `Depends On`.
- `user-stories/proposals.csv` holds them in `Depends On`.
- `user-stories/review.csv` holds them in each open row's story ID, and in the current and suggested values of a `Depends On` row. `retargetRows` in `viewer/shared/review/review.ts` already rewrites these.

The lexicon files, slices and the context map hold none that can change. Slices name only frozen stories, and a frozen story's ID never changes.

## Goals / Non-Goals

**Goals:**

- Work out each save's list of ID changes in one place, so no action that changes IDs can forget it.
- Keep the file API additive: the existing routes and their bodies stay as they are.
- Put all ID rewriting in pure shared functions, so it is testable without a server or browser.

**Non-Goals:**

- Following IDs changed by hand outside the portal.
- Locking or merging when two browser tabs edit the same data folder.
- The graph view of links that cross backlogs.
- Cycle checks across backlogs. Each backlog is checked on its own, as today.
- Story skills writing a new link to another backlog.

## Decisions

### 1. The list of ID changes is worked out at save time, against what is on disk

The autosave keeps a **baseline**, the story list that matches the file on disk, next to its last written text. Before each write it computes the change list as `idChanges(baseline, current)`:

- A story whose code changed maps to its new code.
- A story that is gone and had a unique code maps to `''`.
- Codes that more than one story shared are left out, as `recodedBetween` does today.

After a successful write, the baseline becomes the list it wrote.

This covers every cause of an ID change with one hook, including a change of initials, which the client renumbers and saves. The load case needs one addition. `loadBacklog` already holds the list as parsed before its renumber, so the baseline on open is that parsed list, and the first save carries the IDs the load renumbered.

*Alternative considered: emit a list from each action.* That is the pattern today, and it already misses delete, add, accept, initials and load. One hook at save time cannot miss an action.

### 2. Moved stories are passed on, not deleted

A migrated story disappears from the source's list, so `idChanges` alone would map it to `''` and other backlogs would drop their links to it. The migration therefore registers **forwards** with the source's autosave: the old code of each moved story, mapped to its code in the target. The next save's list takes a forward in place of the `''` entry. Forwards are cleared once that save's list has been sent.

### 3. The server rewrites other backlogs through a new endpoint

The new endpoint is `POST /api/relink`. Its body is `{ from, changes, only? }`:

- `from` is the backlog whose IDs changed.
- `changes` is an object of old code to new code, where `''` means deleted.
- `only`, when given, limits the run to the named backlogs.

For every backlog of the data folder except `from`, the server rewrites the three kinds of file:

- `relinkStories` rewrites the `Depends On` of each story, and drops `''` entries.
- `relinkProposals` does the same for proposed stories.
- `retargetRows` rewrites the open review rows.

These are pure functions in `viewer/shared/`, and the server is only the I/O around them. A file whose text would not change is not written. A file that is changed is written atomically, to a temporary file first and then renamed. The reply is `{ updated: [names], failed: [{ name, file, message }] }`.

*Alternative considered: send the list in the `PUT` body.* That would change the body of an existing route from raw text to JSON. A retry would also have to send the file text again only to reach the other backlogs. A separate call keeps `PUT` unchanged and lets a retry target only the backlogs that failed.

*Alternative considered: rewrite from the client.* The client would need N reads and up to 3N writes per save across the network, and the logic would be split between the two sides. The server already owns the data folder's file list.

### 4. Relink jobs run in order and block "saved"

The autosave keeps a queue of relink jobs, one job per write whose change list is not empty. Jobs run strictly in order, because a later list can build on an earlier one: A becomes B, then B becomes C.

A job whose reply lists failures is retried with `only` set to the failed backlogs, using the same back-off as a failed write. Later jobs wait behind it. While the queue is not empty the status stays saving, or failed with the message naming the file. `settle()` and the warning on page close also wait for the queue.

Re-running a job that already succeeded on a backlog is never done. Applying a list twice can undo a swap, where A became B and B became A.

### 5. The open backlog's own proposals and review follow the same list in memory

When the autosave computes a non-empty list, it hands the list to a callback. `BacklogTool` wires that callback to `review.retarget` and to a relink of the in-memory proposals, which `useProposals` saves on its own. These files are open in memory with their own autosave, so the server must not write them. That is why the server skips `from` entirely.

The scattered `review.retarget` calls after drag, group move, Renumber and Move to Proposed are then removed. One exception stays: Move to Proposed still maps the moved story's old code to its placeholder for its own backlog's files.

### 6. The migration is a pure function, and the target holds old source IDs until the source saves

`migrateStories({ source, target, ids, sourceInitials, targetInitials })` returns `{ source, target, targetHeaders, forwards, recoded }` or `{ error }`. It refuses a frozen story or a story without an ID, as `moveToProposed` does. `source` and `target` are the two story lists with their headers.

1. Take the chosen stories out of the source, and renumber the source.
2. Rewrite the source's links to the moved stories to their target codes, which are the forwards.
3. Merge the headers: append each source column the target lacks, matched without regard to case.
4. Place each copy after the last story of its Epic in the target, or at the end. Renumber the target.

The moved stories' own `Depends On` entries that name source stories keep their **pre-migration** source IDs. Entries that name other moved stories also stay as they were. The source save's relink then rewrites them in the target, together with the target's existing links to source stories, because the target is not `from`.

If the function rewrote them itself, the relink would shift them a second time. For example, `B1-IAM-0004` would become `-0003` in memory, and then the relink would turn `-0003` into `-0002`. Leaving the target in the "old world" until the source saves keeps one rule: each change list is applied exactly once to every file.

Placing the copies at the end of an Epic never changes an existing target ID, so the target's own change list is empty. If a test ever finds it is not empty, the flow sends it as a relink job from the target before the source changes.

### 7. The order of the migration flow

The migration flow lives in a new `useMigrateFlow` in the Stories feature. It runs these steps in order:

1. `settle()` the open backlog. Pending edits and relink jobs reach disk, so the baseline matches the file.
2. Read the target fresh with `readBacklog`, and load it with its initials.
3. Run `migrateStories`.
4. Ask for confirmation, naming the open review suggestions that will be dismissed.
5. Write the target with `store.write`. If this fails, stop: nothing has changed.
6. Register the forwards, replace the source stories in memory, and dismiss the moved stories' open review rows.
7. Await `settle()`, so the source is written and every other backlog, the target included, is relinked before the result note shows.

Step 7 was added after a test in the real portal. Without it the source waited for the 600 ms autosave delay, and a reload inside that gap left the stories in both backlogs, the target's copies naming old source IDs, and no backlog relinked. The page-close warning covered the gap, but it is easy to click through. With step 7 the gap is only as long as the two requests, and the note tells the user when it is over. If the relink fails, `settle()` returns with the status failed and the queue keeps retrying, as for any save.

A crash after step 5 leaves the moved stories in both backlogs, which is visible and repairable. It never loses a story.

### 9. The portal reads the other backlogs into a read-only index

A link to another backlog's story is correct on disk, but the Editor only knows the open backlog's stories, so it flagged such a link as missing and could not list dependents from other backlogs in Required by. The backlog tool therefore keeps an **index of the other backlogs**: for each other backlog of the data folder, its name and its stories' codes, Titles and `Depends On`. It is built in the frontend with the existing list and read calls, and parsed with `loadBacklog`. It is read-only and never written.

The index is built when a backlog opens, and built again after each relink job finishes and after each migration, because those are the moments another backlog's files change through the portal. A change made outside the portal shows after the next open, as the open backlog's own files do.

A pure function in `viewer/shared/backlog/` turns the other backlogs' story lists into two lookups:

- code to `{ backlog, title }`, for labels in Depends On;
- code of an open-backlog story to its dependents in other backlogs, for Required by.

`backlogProblems(stories, external?)` takes an optional set of other backlogs' codes and treats them as existing. Cycles are still followed only inside the open backlog, which matches the Non-Goals.

*Alternative considered: a server endpoint that returns all backlogs' codes.* The existing calls already return the files, data folders hold a handful of backlogs, and the server stays unchanged.

### 10. The review skill's checks read the other backlogs' codes

The review skill turns a "does not exist" problem into a `remove` row, so without this a review would suggest removing every link a migration kept. `toolkit/skills/jois-story-review/read-backlog.mjs` already knows the data folder; it reads the other backlogs' `user-stories.csv`, collects their codes and passes them through `backlogChecks` to `backlogProblems`. The synced copy of `ids.ts` carries the new parameter.

### 8. Frozen stories cannot be ticked

The checkbox in `StoriesTable` is disabled for a frozen story. `tick` and `onCheckAll` filter frozen IDs out of the ranges they pass. `useBacklog` prunes frozen stories from `checked` whenever the stories change, which covers a refresh after the plan skill froze stories.

The shared `removeStories` and bulk functions keep their frozen guards as a second line of defence. The UI messages about skipped stories are removed, because they can no longer trigger.

## Risks / Trade-offs

- **[Risk]** The browser closes while a relink job is still queued. → Its list is lost and other backlogs keep the old IDs. The page-close warning covers this, the same as an unsaved edit.
- **[Risk]** Two browser tabs on the same data folder could apply lists out of order. → This is not supported today either. It is out of scope.
- **[Risk]** A relink write races a skill that writes another backlog's proposals or review file. → The server reads, rewrites and writes each file in one step with an atomic rename, so a skill write is either before or after it. A skill that read the file earlier may still overwrite the change. That window already exists for portal saves today.
- **[Trade-off]** Every save that changes IDs now reads every other backlog's three files. → Data folders hold a handful of backlogs, and files with nothing to change are not written.
- **[Risk]** The specs and the code disagree on hidden ticked rows. "Multi-select in the Stories tab" says bulk edit and delete reach hidden ticked stories, while the code acts only on the rows shown (`visibleChecked`). → Migrate follows the code, and its own requirement says so. The disagreement is older than this change and is left for a separate fix.

## Migration Plan

No data migration is needed. The file formats do not change, and the new endpoint is additive. To roll back, revert the change. Links already rewritten across backlogs stay valid, because they name real IDs.
