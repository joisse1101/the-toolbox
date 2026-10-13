## Why

Stories cannot refer to each other today: a row has no identity that survives a reload, so there is nothing to link. Dependencies between stories are the input the planned dependency graph needs, and they are useful on their own for sequencing work. The team lead also wants the ID to say where a story sits in its epic, and wants to reorder stories by dragging them, so the ID has to follow the order.

## What Changes

- Add an `ID` column (first column) holding a story ID of the form `<PREFIX>-<4 digits>`, for example `IAM-0003`.
  - The prefix is the uppercased initials of the epic's words, ignoring `&` and punctuation (`Identity & Access Management` becomes `IAM`). If another epic earlier in the backlog already uses the prefix, the later epic's prefix is lengthened (`DD` then `DDI`).
  - The number is the story's position among the stories of its epic, counting from 1 in file order. **The ID is therefore not fixed**: it is recomputed whenever the order, the epic membership or the set of stories changes. New stories go to the bottom of their epic.
  - A story with a blank epic has no ID.
  - Whenever an ID changes, every `Depends On` reference to it is rewritten to the new ID, so links keep pointing at the same story.
- Drag and drop in the Editor tab's story panel:
  - Dragging a story within its epic group reorders it, and the IDs of the stories in the group follow.
  - Dragging a story into another epic's group moves it to that epic at the dropped position; it takes that epic's prefix and position.
- Add a `Depends On` column holding semicolon-separated story IDs. "Required by" is derived on screen, never stored.
- Story form: show the ID (read-only), a "Depends on" picker that lists other stories by ID and label, and the derived "Required by" list. Reject a link that would create a cycle.
- Stories tab: show ID and Depends On columns.
- On load, IDs are recomputed from file order (this also gives IDs to files that have none) and references are rewritten to match. Dangling references, ambiguous references and cycles already in the file are flagged, not repaired.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `user-story-editor`: adds position-based story IDs, drag-and-drop reordering in the story panel, dependencies, new CSV columns, and the matching changes to the Stories tab, bulk epic edit, delete and the grouped story list (reordering changes the saved row order).

## Impact

- `src/user-story-generator/model.js`: new columns, dependency fields.
- New `src/user-story-generator/ids.js`: prefix, renumbering and reference rewriting, reorder/move, dependency helpers.
- `src/user-story-generator/hooks/useBacklog.js`: every reducer path that adds, deletes, moves or re-epics a story ends in one renumber step; new `moveStory` and `commitEpic` actions.
- `src/user-story-generator/components/StoryList.jsx` (drag and drop), `StoryForm.jsx`, `StoriesTab.jsx`, `issues.js`, `tool.css`.
- `test/`: unit tests for the ID, reorder and dependency rules.
- Existing CSVs: the first save adds `ID` and `Depends On` columns. Other columns are untouched.
- No new dependencies (native HTML5 drag and drop). The dependency graph is a separate later change (`add-dependency-graph`).
- **Trade-off:** IDs written down elsewhere (chat, tickets) can go stale after a reorder. This is the accepted cost of position-based IDs.
