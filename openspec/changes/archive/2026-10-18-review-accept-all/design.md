## Context

The Review tab lists units (`unitsOf`: one row, or one split group) grouped by Area through `reviewOverview`. Apply on one unit is `applySuggestions(stories, rows, headers)` in `core/review.js`, a pure function that returns `{ stories }` (renumbered) or `{ error }`; `App.jsx` then marks the unit's rows `applied` with `review.decide`. `unitState` already reports `open`, `locked` or `stale` against the current stories. Single Apply does not retarget other review rows after a renumber; rows whose story code no longer matches simply show as stale.

## Goals / Non-Goals

**Goals:**
- Accept all for the whole review and for one Area section, with the skip rules of the spec.
- One backlog update and one review-status update per run.
- The selection and ordering rules are pure and tested.

**Non-Goals:**
- No Accept all in the story form, no per-story bulk, no undo.
- No change to the review file format, the skills or the single Apply.
- Skipped units are not dismissed or changed.

## Decisions

1. **Pure `acceptAll(stories, units, headers)` in `core/review.js`.** It walks the units in the given order, skips a unit that is an `unlock` row, has a `confirm` row, or is `locked` per `unitState`, and otherwise calls `applySuggestions` on the stories left by the previous unit; an `{ error }` or a `stale` state skips the unit. It returns `{ stories, applied: [units], skipped: [{ unit, reason }] }` with reason one of `unlock`, `locked`, `check`, `failed`. Alternative considered: loop over the existing `applyUnit` in `App.jsx`; rejected because it dispatches once per unit, makes the skip logic untestable, and leaves state reads between dispatches to React.
2. **Stale is checked on the evolving stories**, not the starting ones, because an applied unit can invalidate a later one (a removed criterion, a renumber, an added link). `unitState` on the current stories decides each time.
3. **One reducer action `acceptSuggestions`** stores the resulting stories through `withStories`, and a `useBacklog` action method computes `acceptAll` from `stateRef` and returns the summary, as `applySuggestions` does. Then `App.jsx` calls `review.decide` once with all applied units' indexes, so the review file is rewritten once.
4. **Scope from the tab.** `ReviewTab` passes the units of the header (all sections) or of one section to `onAcceptAll(units)`. The eligible count shown in the confirm is computed with the same pure function on the starting stories (a dry run), so it is the number the run is expected to apply; the summary reports the real outcome.
5. **Confirm and summary live in `App.jsx`**: `window.confirm` as in the move-to-Proposed flow, and the summary goes through `review.notify`-style notice area. The notice is currently styled as an error; add a neutral kind for the summary, keeping the error style for failures.
6. **Button state**: disabled when the scope has no units; the confirm count may be zero-eligible, in which case the tool skips the confirm and reports "nothing to apply" with the reasons.

## Risks / Trade-offs

- A split or add that renumbers codes can make later units of the run unmatchable; they are skipped as `failed` and stay open (as an orphan or stale entry). The summary makes this visible and a second click applies whatever is still eligible.
- The dry-run count and the real run use the same function on the same stories, so they only differ if state changes between the confirm and the run; accepted.
- A `confirm`-default suggestion is never bulk-applied, so a review made mostly of them gets little from the button; this is intended.
