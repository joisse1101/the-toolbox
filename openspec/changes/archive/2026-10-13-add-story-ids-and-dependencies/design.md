## Context

See `proposal.md` for motivation and `specs/user-story-editor/spec.md` for the rules.

Observed today:
- `model.js` holds the CSV to story mapping as pure functions. Recognised columns are matched by header name (`COLUMNS`), unknown columns ride along in `story.cells`, and `loadBacklog` appends any missing recognised column to `headers`, so adding columns to old files already works.
- `story.id` is a per-session counter (`nextId`), used as the React key, the selection and the tick set. It is not persisted. The new persisted story ID must not be confused with it.
- State lives in the `useBacklog` reducer. Stories are never mutated in state; `edit` clones one story, `bulk` clones all stories. Auto-save serialises `stateRef.current.backlog`.
- `StoryList` renders `groupByEpic(stories)`; grouping is display only and file order is the array order.

## Goals / Non-Goals

**Goals:**
- Because IDs depend on position, make them a pure function of the stories array: one `renumber(stories)` that every mutation ends with. Tested with `node --test`, no React or DOM.
- Links never silently point at a different story after a renumber.
- Drag and drop with no new dependency.

**Non-Goals:**
- The dependency graph (`add-dependency-graph`).
- Keyboard reordering (a follow-up if wanted), touch-screen drag, reordering in the Stories tab table, or reordering epic groups.
- Undo, or keeping old IDs resolvable after a reorder.
- Linking stories across backlog files.

## Decisions

**Persisted ID is `story.code`; `story.id` stays the session key.** `code` is `''` for a story with a blank epic. `Depends On` is held as `story.dependsOn: string[]` of codes.

**IDs are derived, but also written to the CSV.** Excel users read and filter by ID and `Depends On` refers to it, so the column is kept. On every mutation the codes are recomputed from epic and position. Alternative: store only `Depends On` as story references and compute IDs at display time. Rejected: the CSV would then contain IDs nobody can resolve.

**`renumber(stories)` is the single place the rules live (`ids.js`).**
1. Epic prefixes: walk epics in order of first occurrence, compute `epicPrefix(epic)` (initials of words split on non-alphanumerics, uppercased), and lengthen with letters from the epic's first word if an earlier epic holds the prefix; if the first word runs out continue with later words' letters, then a digit suffix.
2. Numbers: for each epic, the nth story in array order gets `n`, padded to four digits (longer past 9999).
3. References: build a map from each story's old code to its new code, and rewrite every `dependsOn` through it. Rewriting is done on the old codes simultaneously, so swaps (`A`<->`B`) are correct. Old codes held by more than one story are ambiguous and are left alone. Entries matching no old code (dangling) are left alone.
It returns new story objects only for stories that changed, so React state stays immutable and unchanged stories keep referential identity.

**Every mutation ends with `renumber`**: `add` (new story appended, so it lands last in its epic; if its epic is blank it has no code), `delete` (stripping references to the deleted code first, then renumber closes the gap), `bulk` (moves epic-changed stories to the end of their new epic, preserving their relative order), `commitEpic`, `moveStory`, and load. Because the rules are idempotent, a no-change renumber returns the same state, and `edits` is bumped only when something changed.

**Epic commit.** Typing in Epic changes `story.epic` (the list already regroups live) but not the code. `commitEpic(id)` on blur or datalist choice moves the story to the bottom of its new epic in array order, then renumbers. A datalist pick is detected via the `input` event's `inputType` of `insertReplacementText` in Chromium; blur is the guaranteed commit elsewhere. If the epic did not change since the last commit the action is a no-op. The story form therefore tracks the epic text at focus time; the reducer compares with the epic the code was last computed for (`story.codedEpic`, not persisted).

**Reorder by array slots.** `moveStory(stories, id, targetEpic, beforeId | null)`:
- Same epic: take the array indices occupied by that epic, rearrange the epic's stories among those same indices. Rows of other epics do not move and group order cannot change.
- Other epic: remove the story, set its epic, and insert it immediately before the story `beforeId` in the array, or immediately after the target epic's last story when `beforeId` is null. Removing the first row of the source epic can change group order if its remaining rows come later; this is accepted.
- Then `renumber`.
Alternative: keep a separate order list. Rejected: file order already is the order, and Excel users see exactly what the tool shows.

**Drag and drop uses native HTML5 events in `StoryList`.** Each story `<li>` is `draggable`; `dragstart` records the id, `dragover` on rows computes before/after from the pointer's position over the row, and shows a drop indicator line (CSS class, no layout shift); `drop` calls `moveStory`. The epic header `<li>` also accepts drops (insert at the top of that group), and the "(No epic)" header and rows reject them (`dragover` not prevented). Alternative: `@dnd-kit` or `react-dnd`, which give keyboard support and touch but add a dependency and a rendering model for one list. Revisit when the dependency graph change brings in React Flow, which has its own drag handling for the canvas, not this list.

**Dependencies.** `dependentsOf(stories, code)` scans `dependsOn`. `wouldCycle(stories, from, to)` is a reachability search over `dependsOn`; the picker excludes self, current links and every story from which the open story is reachable. Chips for current dependencies (link plus remove) and a text input with a datalist of `CODE  label` options; adding happens when the input value equals an offered option. The picker is not part of arrow-key navigation, and the ID is plain text.

**Problems are computed, not repaired.** `backlogProblems(stories)` reports dangling, self, cyclic and ambiguous references, surfaced via `storyIssues` as warnings so list, tab and form already display them. Duplicate codes in a loaded file disappear on load because codes are recomputed; the ambiguity only matters for the references that named them.

**Load.** `loadBacklog` calls `renumber`, which gives codes to files without an `ID` column and fixes codes after outside edits. It reports whether anything changed so `useBacklog` marks the backlog dirty and the normal auto-save writes the result.

**CSV placement.** `ID` first and `Depends On` before `Acceptance Criteria` in `COLUMNS` for new backlogs. For existing files `loadBacklog` appends missing columns at the end as it does now, so users' column order is preserved.

## Risks / Trade-offs

- [IDs quoted elsewhere (chat, tickets) go stale after a reorder] -> inherent to position-based IDs, chosen by the user; links inside the file are rewritten.
- [Renumbering rewrites many cells on one drop] -> one reducer step, one save; bulk confirmation says IDs will change.
- [Two people edit one file, one reorders] -> the other's references are interpreted against current file contents on reload; stale entries show as dangling or ambiguous warnings rather than silently re-pointing, except where an ID now names a different story, which cannot be detected.
- [Excel users edit `ID` by hand] -> overwritten on load, since IDs are derived; `Depends On` edits are honoured.
- [Native drag and drop is mouse-only and hard to test headlessly] -> logic is in the pure `moveStory`, covered by unit tests; the DOM wiring is verified manually. Keyboard reorder is a non-goal for now.
- [Datalist selection not distinguishable from typing in some browsers] -> blur is the guaranteed commit point.
- [Moving a group's first row away can reorder epic groups] -> accepted; documented above.

## Migration Plan

No separate step. Opening an old file computes IDs in memory and the existing auto-save writes the new columns. Rollback is reverting the commit; older code keeps `ID` and `Depends On` as unknown columns and writes them back unchanged.
