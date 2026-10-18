## Why

In the Editor tab a single story can be dragged, but the epics and features the list is grouped by cannot, so changing the order of a whole feature or epic means dragging its stories one by one. The list also shows stories grouped by epic and feature while IDs follow file order, so a file whose features are interleaved shows IDs that do not read top to bottom, and there is no way to put that right from the tool.

## What Changes

- Epic and feature heads in the story panel become draggable. Dropping moves the whole group (collapsed or expanded) as one block, with the same drop line the single-story drag uses, placed at group boundaries.
- A feature can only be dropped among the features of its own epic. The "(No epic)" group cannot be dragged.
- A new **Renumber** button beside **Add story** gathers each feature's rows into one block inside its epic, in the order shown, and then renumbers. Locked stories keep their IDs. It asks for confirmation and is disabled when nothing would change.
- Open review suggestions follow their story to its new ID after a group drag, after Renumber and, as a fix, after dragging a single story, which today leaves them showing the "no longer match a story" notice.
- Both operations are saved by the normal auto-save and use the existing ID, locked-story and `Depends On` rules; no new column and no file-format change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-story-editor`: adds the requirements "Reorder groups by drag and drop" and "Renumber stories in the displayed order" to the story panel, and extends "Reorder stories by drag and drop" so review suggestions follow a dragged story.

## Impact

- `core/ids.js`: two pure functions (move a group; gather features into blocks), tested in `test/ids.test.mjs`.
- `app/frontend/user-story-generator/`: `StoryList.jsx` (draggable heads, group drop markers, Renumber button), `hooks/useBacklog.js` (two reducer actions), `App.jsx` (wires the button and its confirmation), `tool.css` (head drag styles).
- No change to the backend, the file API, the skills or the MCP server.
