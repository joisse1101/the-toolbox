## 1. Core: move a group

- [x] 1.1 Add `moveGroup` to `core/ids.js` (epic move regroups into epic blocks; feature move refills only the epic's slots; unchanged or invalid input returns the same array) and verify `node --test test/ids.test.mjs` passes new tests for: feature move, epic move, interleaved epics gathered, other epics' rows untouched, feature target in another epic ignored, blank epic ignored, no-op returns the same array
- [x] 1.2 Add tests for locked stories and prefixes in `test/ids.test.mjs`: locked story keeps its ID when its group moves, `DD`/`DDA` swap when two epics sharing initials trade places, `Depends On` follows renumbered stories; verify they pass

## 2. Core: gather features

- [x] 2.1 Add `gatherFeatures` to `core/ids.js` (per epic, refill its slots with rows grouped by feature in first-appearance order, then `renumber`; same array when nothing changes) and verify tests pass for: interleaved features gathered, other epics untouched, locked story keeps its ID, already-in-order input returns the same array

- [x] 2.2 Add `recodedBetween(before, after)` to `core/ids.js` (old code -> new code for stories, matched by `id`, whose code changed; empty map when none) and verify tests cover a moved group, a gathered feature, a locked story that keeps its code, and a story without an ID

## 3. Editor state

- [x] 3.1 Add `moveGroup` and `renumberDisplayed` actions to `app/frontend/user-story-generator/hooks/useBacklog.js` (reducer cases keep `selectedId`; a no-op returns the same state so nothing is saved) and verify with `npm run build`

## 4. Story panel UI

- [x] 4.1 In `StoryList.jsx` make epic and feature heads draggable (not "(No epic)"), generalise the drag state to story / feature / epic, and accept drops only at group boundaries as in design decision 4; verify in the running app that a collapsed and an expanded epic and feature move, and that a click still toggles a head
- [x] 4.2 Show the existing `drop-before` / `drop-after` line for group drops in `tool.css` and verify by hand that the line never appears inside the dragged group's own block
- [x] 4.3 Add the Renumber button beside Add story (rendered only when `onRenumber` is passed, disabled with a tooltip when `gatherFeatures` changes nothing) and wire `onMoveGroup` / `onRenumber` in `App.jsx` with a confirmation that states how many stories get a new ID; verify that cancel changes nothing and the Proposed tab is unchanged
- [x] 4.4 In `App.jsx`, before dispatching a group move, Renumber or a single-story move, call `review.retarget(recodedBetween(stories, after))` (the single-story drag now goes through an `App.jsx` handler instead of dispatching `actions.moveStory` directly); verify by hand that an open suggestion on a story whose ID changes is still shown on it, under the new ID, after each of the three operations, and that no "no longer match a story" notice appears

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run build`, then check by hand against a backlog with interleaved features and a locked story: the scenarios of both new requirements in `specs/user-story-editor/spec.md` hold, and the saved CSV rows are in the expected order
