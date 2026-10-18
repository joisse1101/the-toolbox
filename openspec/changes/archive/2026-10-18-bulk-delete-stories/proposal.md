## Why

Removing stories from a backlog takes one confirm per story: the Editor tab can delete only the selected story, and its Delete button sits in the side list, away from the story it acts on. The Stories tab already lets the user tick many stories (and lock or edit them in bulk) but not delete them.

## What Changes

- Stories tab: a **Delete selected (N)** button in the bulk bar, next to Lock/Unlock selected. It asks once, deletes every ticked story that is not locked, and reports the locked ones it kept ("2 locked stories were kept").
- Editor tab: the single-story delete moves from the side list into the story form's header row, right after **Move to Proposed**, and is labelled **Delete story**. The side list keeps only Add.
- Alt+D, the confirmation and the locked-story guard are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: "Multiple stories per backlog" (where the delete control is), "Lock a story" (locked stories are skipped by bulk delete) and a new requirement for deleting selected stories.

## Impact

- `core/ids.js`: new `removeStories(stories, ids)` beside `removeStory`; `test/ids.test.mjs`.
- `app/frontend/user-story-generator/`: `hooks/useBacklog.js` (`deleteChecked` action), `components/StoriesTab.jsx`, `components/StoryList.jsx` (delete button removed), `components/StoryForm.jsx` (delete button added), `App.jsx` (wiring).
- No data format, API or backup change.
