## Why

A review can hold dozens of suggestions, and the Review tab only applies them one click at a time. Most are safe to take as they are, so the user wants to accept them in bulk, for the whole review or for one Area, without giving up the checks that keep unsafe ones out.

## What Changes

- The Review tab gets an **Accept all** button in its header, and each Area section gets an **Accept all** button for that section only.
- Accept all applies the open suggestions in tab order, each against the backlog as the previous one left it.
- It skips, and leaves open: units of a locked story, `unlock` rows, units with a `confirm` ("check this default") row, and any unit that fails or turns stale while the run goes on.
- The user is asked to confirm first, with the number of suggestions that will be applied; afterwards a summary says how many were applied and how many were left open and why.
- The backlog edits and the review statuses of one run are made together and saved like any single Apply.

## Capabilities

### New Capabilities

### Modified Capabilities
- `backlog-review-suggestions`: adds a requirement for Accept all in the Review tab (header and per Area), its skip rules, the confirmation and the summary.

## Impact

- `core/review.js`: a pure function choosing and applying the eligible units in order, returning the new stories, the applied unit indexes and the skipped units with reasons.
- `app/frontend/user-story-generator/`: `hooks/useBacklog.js` (one bulk action), `App.jsx` (handler, confirm, summary notice), `components/ReviewTab.jsx` (the buttons).
- `test/`: tests for the new pure function.
- No change to the review file format, the server or the skills.
