## 1. Core

- [x] 1.1 Add `removeStories(stories, ids)` to `core/ids.js` (skip locked, strip deleted codes from `Depends On`, renumber once, return `{ stories, skipped }`)
- [x] 1.2 Tests in `test/ids.test.mjs`: several deleted, locked skipped and counted, links cleaned, locked code kept, same array when nothing deleted

## 2. Backlog state

- [x] 2.1 Add the `deleteMany` reducer case and `deleteChecked()` action to `hooks/useBacklog.js` (confirm, hidden ticks included, selection pruned, `selectedId` kept or moved to a neighbour)

## 3. UI

- [x] 3.1 `StoriesTab.jsx`: add the `Delete selected (N)` danger button after Unlock selected, with the "n locked stories were kept" note
- [x] 3.2 `StoryForm.jsx`: add the `Delete story` button after Move to Proposed (disabled and hinted for a locked story)
- [x] 3.3 `StoryList.jsx`: remove the delete button and `onDelete` prop; `App.jsx`: wire the new props

## 4. Verify

- [x] 4.1 `npm test` and `npm run build`
- [x] 4.2 Try it in the browser: bulk delete with a locked story ticked, Delete story in the form, Alt+D, a locked story's disabled button
