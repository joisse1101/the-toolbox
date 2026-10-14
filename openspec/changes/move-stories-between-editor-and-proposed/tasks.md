## 1. Core logic

- [x] 1.1 Add `moveToProposed` to `core/proposals.js` (new placeholder, rewrite `Depends On` in backlog and proposals, renumber, refuse a story without a code)
- [x] 1.2 Add a `core/review.js` helper returning the open units of a story code
- [x] 1.3 Tests in `test/` for `moveToProposed` (links follow, own deps kept, placeholder not reused, round trip with `acceptProposed`) and the review helper (open vs applied/dismissed, split group)

## 2. Proposed tab: partial accept

- [x] 2.1 `StoryList`: optional checkbox column (`checked`, `onToggle`) that does not change the open story
- [x] 2.2 `ProposedTab`: ticked-set state (pruned, cleared after accept); replace Accept story with Accept selected (n), disabled when none ticked; keep Accept all
- [x] 2.3 `App.jsx`: `acceptSelected` passes the ticked ids to `accept`

## 3. Editor tab: Move to Proposed

- [x] 3.1 `StoryForm`: Move to Proposed button in the ID row, disabled without a code, only when `onMoveToProposed` is passed
- [x] 3.2 `App.jsx`: handler that dismisses open suggestions (confirm only if any), applies `moveToProposed` to backlog and proposals, shows an ok/error notice
- [x] 3.3 Wire the Editor tab's form only

## 3b. Review suggestions follow renumbering

- [x] 3b.1 `moveToProposed` returns the recoded IDs; `retargetRows` (review.js) and `useReview.retarget` re-point open rows; called from the move handler; test

## 4. Verify

- [ ] 4.1 `npm test`, `npm run build`, and try both moves in the browser (locked-file retry path included)
- [x] 4.2 Update `CLAUDE.md` Architecture line for `proposals.js` if wording needs it
