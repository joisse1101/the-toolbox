## Why

Stories can only travel one way and only all-or-nothing in practice: the Proposed tab accepts "the selected story" or "all", and there is no way to send a story from the backlog back to Proposed. A team lead who wants to park a story for rework, or accept a handful of proposals, has to delete and retype or accept everything.

## What Changes

- Add **Move to Proposed** to the story form in the Editor tab, in the header row next to the story ID. It moves that one story from the backlog to the proposals file.
- Moving gives the story a fresh `NEW-<n>` placeholder, rewrites every `Depends On` entry that named its old ID (backlog and proposals), and renumbers the backlog.
- Open review suggestions of the moved story are marked **dismissed**. The user is asked to confirm only when there is something to dismiss; otherwise the move happens at once.
- Proposed tab: each proposed story can be ticked; **Accept selected (n)** moves the ticked stories into the backlog (partial move) and replaces **Accept story**. **Accept all** stays.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `story-proposals`: adds moving a backlog story to Proposed, and accepting a multi-selection instead of one story.
- `backlog-review-suggestions`: open suggestions of a story moved to Proposed are dismissed.
- `user-story-editor`: the story form gets the Move to Proposed button.

## Impact

- `core/proposals.js`: new pure `moveToProposed` (the reverse of `acceptProposed`, which already takes a set of ids).
- `core/review.js`: helper to find a story's open suggestions and mark them dismissed.
- `app/frontend/user-story-generator/`: `App.jsx` (wires the move across backlog, proposals and review state), `StoryForm.jsx` (button), `StoryList.jsx` / `ProposedTab.jsx` (multi-select), `hooks/useProposals.js` (selection state).
- Tests for the new pure logic. No server, API or data-format change.
