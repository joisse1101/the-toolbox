## Context

`removeStory` (core/ids.js) deletes one story, skips a locked one, strips its code from other stories' `Depends On` and calls `renumber`. The Stories tab keeps a `checked` set in `useBacklog` state, and `withStories` already drops deleted ids from it. Lock/Unlock selected (`lockStories`, `onLockChecked`, `bulkNote`) is the pattern for a bulk action that skips some stories and reports how many. The Proposed tab has a `Delete selected (N)` button with the same confirm-then-delete flow.

## Goals / Non-Goals

**Goals:** bulk delete from the Stories tab; one delete control for the open story, next to Move to Proposed.

**Non-Goals:** undo (backups cover it, as today); a bulk delete in the Editor list; changing Alt+D.

## Decisions

- **`removeStories(stories, ids)` in core/ids.js**, returning `{ stories, skipped }` like `lockStories`, rather than looping `removeStory` in the hook. It drops the unlocked ids in one pass, strips every deleted code from `Depends On`, and renumbers once. `skipped` counts selected locked stories. As in `removeStory`, a code is stripped from links only when it was unique. It returns the same array when nothing is deleted.
- **`deleteChecked()` in useBacklog** confirms (`Delete N stories?`), dispatches a `deleteMany` reducer case using `removeStories` over `state.checked` (hidden ticks included, as Lock does), and returns `{ deleted, skipped }`. The reducer keeps `selectedId` if it survives, otherwise selects the neighbour as the single `delete` case does. `withStories` already prunes `checked`.
- **StoriesTab** calls it from a `danger` button; the note is `n locked story/stories kept`, or a "nothing deleted" message when all are locked. The confirmation is skipped when every selected story is locked, since nothing would change.
- **Single delete moves to StoryForm** as an `onDelete` prop, rendered after Move to Proposed with the same disabled and hint pattern (`Unlock the story first`). StoryList drops its `onDelete` prop and button; `App.jsx` passes `actions.deleteSelected` to the form instead. `deleteSelected` and Alt+D are untouched.

## Risks / Trade-offs

- The confirm dialog is the only guard against deleting many stories; mitigated by naming the count and by backups.
- The form's delete button sits near Move to Proposed, which also removes the story from the backlog; the labels and the danger styling keep them distinct.
