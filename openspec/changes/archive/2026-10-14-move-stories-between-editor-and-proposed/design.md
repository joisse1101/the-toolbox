## Context

Backlog IDs are derived (`renumber`), proposal IDs are stable `NEW-<n>`. `acceptProposed(backlog, proposed, ids, headers)` already takes a set of ids and does placement, link rewriting and cycle checks. The backlog (`useBacklog`), proposals (`useProposals`) and review (`useReview`) state live in separate hooks, combined in `App.jsx`, which already does the accept across the first two (backlog replaced first, proposals second, so a crash leaves a duplicate, not a loss).

## Goals / Non-Goals

**Goals:** a pure reverse of accept; partial accept through the existing function; one confirm only when something is dropped.
**Non-Goals:** multi-select move in the Editor tab; changing placement or ID rules; moving stories without an Epic.

## Decisions

1. **`moveToProposed(backlogStories, proposedStories, id, headers)` in `core/proposals.js`**, returning `{ backlog, proposals, moved }` or `{ error }`. Steps: take the story, give it `code = nextPlaceholder(proposed, backlog)`, append it to the proposals, rewrite `Depends On` entries naming its old code in the remaining backlog and proposals to the placeholder, then `renumber` the backlog. Pure, never mutates, same style as `acceptProposed`. Rewriting before `renumber` matters: otherwise renumber would re-bind a link to whichever story takes the old position.
2. **Cells.** The moved story keeps `cells` as they are; proposals share the backlog's columns, so no reshaping. Its own `dependsOn` is untouched (links to backlog stories are valid in proposals).
3. **Cycles.** Renaming a code cannot create a cycle, so no cycle check is needed; `nextPlaceholder` already avoids numbers the backlog still mentions.
4. **Dismissing suggestions.** A `core/review.js` helper returns the open units for a story code (`openCounts` and `unitsOf` already know what is open vs stale); `App.jsx` calls `review.decide(indexes, 'dismissed')` with them, the same call as the Dismiss button. The confirm is `window.confirm`, matching `deleteSelected`, and runs only when that list is non-empty, before anything changes. Order of changes: confirm, then backlog, proposals, review.
5. **Multi-select UI.** `StoryList` gets an optional `checked` set and `onToggle`; when given it renders a checkbox per row (clicking the checkbox does not change the selected/open story). Only `ProposedTab` passes them. The ticked set lives in `ProposedTab` state, is pruned to ids that still exist, and is cleared after an accept. `onAccept` receives the ticked ids; `App.jsx` `acceptSelected` passes them to `accept`.
6. **Button placement.** `StoryForm` takes an optional `onMoveToProposed`; the Editor tab passes it, the Proposed tab does not, so the button is absent there. It sits in the `.story-code` row and is disabled when `s.code` is empty.

## Risks / Trade-offs

- Three stores are written for one action (backlog, proposals, reviews); a failure on one is reported and retried by that store's autosave, as accept does. Mitigation: same ordering as accept.
- Dismissed suggestions are not restored if the story is accepted back (accepted back gets a new ID anyway). Acceptable and stated in the prompt text.
