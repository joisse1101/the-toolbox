## Context

IDs are derived: `renumber` in `core/ids.js` numbers each epic's stories by file order and runs after every structural edit. The story panel shows `groupByEpic` order (epic, then feature, each by first appearance), which equals file order only when each epic's rows, and each feature's rows inside it, are contiguous. `moveStory` already shows the pattern for touching one epic only: take the epic's slots in the array and refill them, so other epics' rows stay put. `StoryList.jsx` already has the drag state (`drag`, `drop`, `drop-before`/`drop-after` classes) for stories; the Proposed tab reuses the component without moves of this kind.

## Goals / Non-Goals

**Goals:**
- Move a whole epic or feature by dragging its head, collapsed or not.
- One pure, tested function per operation in `core/`; the UI only dispatches.
- Renumber makes the displayed order and the numbering agree, without moving other epics' rows.

**Non-Goals:**
- Dragging a feature to another epic (it would change the epic of locked stories).
- Keyboard reordering of groups.
- Group drag or Renumber in the Proposed tab (its IDs are placeholders and are never renumbered).
- Retargeting for other renumbering paths (adding or deleting a story, changing an Epic); only the drags and Renumber are covered.

## Decisions

**1. `moveGroup(stories, group, beforeKey)` in `core/ids.js`.** `group` is `{ epic }` or `{ epic, feature }`; the target is the group of the same level to land before (`null` = last). Epic move: the stories are regrouped into blocks of epics in the new order, each epic keeping its stories' relative order; this also gathers an epic whose rows were interleaved with another's. Feature move: only the epic's own slots are refilled, features as contiguous blocks in the new order, so other epics' rows stay put (same rule as `moveStory`). Both finish with `renumber`; unchanged order returns the same array so nothing is saved. A blank epic, an unknown group or a feature target in another epic returns the same array. *Alternative:* moving stories one at a time with `moveStory`; rejected, it would renumber at every step and has no notion of a block.

**2. `gatherFeatures(stories)` in `core/ids.js` for Renumber.** For each epic, refill that epic's slots with its rows grouped by feature in first-appearance order, then `renumber`. It also covers the case where only IDs are off. Same array when nothing changes, which is also what the button's disabled state is computed from. *Alternative:* plain `renumber`, rejected by the user: IDs would not read top to bottom in the panel when features are interleaved.

**3. Locked stories.** Rows of a locked story move with their group; `renumber` already pins its code and its epic's prefix. No special case is added in either function. A feature whose stories are partly locked still moves as a block.

**4. Drop targets are group boundaries only.** While an epic is dragged, an epic head offers "before this epic" and the last row of an epic block offers "after it"; while a feature is dragged, feature heads of the same epic offer "before" and the last row of the epic's last feature offers "after". Anywhere else shows no line and does not accept the drop. This is why an expanded group's line never appears inside it. The marker reuses `drop-before` / `drop-after`. State: `drag` becomes `{ kind: 'story' | 'feature' | 'epic', ... }` instead of a bare id, and `drop` carries the matching target.

**5. Wiring.** `StoryList` takes `onMoveGroup` and `onRenumber`; heads are `draggable` and the Renumber button renders only when `onRenumber` is given, so the Proposed tab is unchanged. `useBacklog` gets `moveGroup` and `renumberDisplayed` reducer actions that keep the selection. The confirmation text and the disabled state are built in `App.jsx`/`StoryList` from `gatherFeatures(stories)` (the count of stories whose `code` differs).

**6. Review suggestions follow the new codes.** Open review rows are keyed by story code, and the review state lives in `useReview`, not in the backlog reducer. A pure `recodedBetween(before, after)` in `core/ids.js` maps old code -> new code for the stories (matched by their internal `id`) whose code changed. The single-story drag takes the same path (it is the third caller, which is why the helper is shared). `App.jsx` computes the result of the operation once with the core function, calls `review.retarget(recodedBetween(stories, after))` (already used by Move to Proposed; it saves the review file), then dispatches the reducer action. The same map gives the count in the Renumber confirmation. *Alternative:* retarget inside the reducer; rejected, the reducer has no access to the review hook and would need a cross-hook side effect.

## Risks / Trade-offs

- [Epic drag renumbers whole epics when prefixes are shared (`DD`/`DDA`)] → covered by a scenario; locked stories pin their prefix, and links are rewritten by `renumber`.
- [Review file and backlog are saved separately, so a crash between the two leaves suggestions on old codes] → retarget first, then the backlog, like Move to Proposed; the orphan notice already covers the leftover case.
- [Adding, deleting or an Epic change also renumber and still orphan suggestions] → out of scope here; the shared `recodedBetween` makes them a one-line follow-up each.
- [Gathering rows changes the CSV row order in Excel] → intended, limited to one epic's own rows; the backup button exists for a safety copy.
- [Dragging a head also toggles it on click] → the accordion toggles on click only; a drag does not fire a click, which the tasks verify by hand.
