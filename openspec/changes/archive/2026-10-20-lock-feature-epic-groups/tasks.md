## 1. Group lock state

- [x] 1.1 Add `groupLockState(stories)` to `core/ids.js` (`'all'`, `'some'` or `'none'`, counting every story passed in) and cover empty, none, some, all and a story without an ID in `test/ids.test.mjs`; `node --test test/ids.test.mjs` passes

## 2. Action

- [x] 2.1 Add `lockGroup(stories, on)` to the actions in `hooks/useBacklog.js`, dispatching the existing `lock` action with the group's ids and returning `{ skipped }`; verified through the UI in task 3.3 (no new reducer case)

## 3. UI

- [x] 3.1 In `StoryList.jsx` add an opt-in `onLockGroup` prop and a lock button on each epic and feature head: it shows the state from `groupLockState`, stops propagation of click and key events, is not draggable, and has a `title` and `aria-label` that say what a click does; the Proposed tab's list still renders no button
- [x] 3.2 Style the button and the partial mark in `tool.css` with the existing CSS variables; check light, dark and a narrow window by eye
- [x] 3.3 In `App.jsx` pass `onLockGroup` to the Editor's `StoryList`, locking when any story is unlocked and unlocking otherwise, and show "n skipped (no ID)" through the existing note line; `npm run build` succeeds and in the browser: lock a feature, lock an epic, unlock, partial state after adding a story, a collapsed group stays collapsed, a blank-Epic group reports the skip, and a reload keeps the locks

## 4. Docs

- [x] 4.1 Describe the group lock in the Editor paragraph of `CLAUDE.md` (button on group heads, derived state, not stored) and run `npm test`
