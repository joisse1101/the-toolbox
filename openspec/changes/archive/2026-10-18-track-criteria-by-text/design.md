## Context

See proposal.md - Why. Today `editState` and `editExisting` in `core/review.js` read `story.criteria[n - 1]` from the row's `AC<n>` label and, in `editState`, compare that slot's text with `row.current`. `criterionNumberOf(unit)` reads the same number from the row to place the suggestion in the form. `applySuggestions` already sorts a unit's rows (replaces, removes from the highest number down, adds), which keeps a multi-row unit correct but does nothing for rows applied in separate clicks.

## Goals / Non-Goals

**Goals:**
- One lookup, `locateCriterion(story, row)`, returns the 1-based position of the criterion a row targets, or `null`. All three call sites use it, so placement, the stale check and Apply cannot disagree.
- Rows of one story can be applied in any order, one at a time.

**Non-Goals:**
- No stable criterion IDs, no label rewriting in the review file, no fuzzy matching.
- No change to the writer scripts, the MCP tools, `fillCurrent` or the review CSV columns.
- No change to the apply order in `applySuggestions`.

## Decisions

**Match on `Current`, with the label as a hint.** `Current` is the criterion text the writer recorded, so it is the row's identity. The lookup tries slot `n` first and falls back to a search of all criteria. Trying the slot first keeps today's result in the common case and decides which of two identical criteria is meant when one sits at the named slot. Alternative: always search by text. Rejected because two criteria with identical text would then be ambiguous even when the label disambiguates them.

**Compare without the label, ignoring case and whitespace.** `criterionText(c, n)` embeds the number, so the comparison cannot use it once the number may differ. Strip the leading `AC<n>:` from `Current` and compare with `norm` against the criterion's `Given ..., when ..., then ...` text. Exact otherwise; no similarity threshold.

**Exactly one match, else stale.** Zero matches means the criterion was edited or removed. Several matches without the named slot being one of them is ambiguous and must not guess. The stale reason says which.

**`criterionNumberOf` takes the story.** `criterionNumberOf(unit, story)` calls `locateCriterion` for a single replace or remove row. `StoryForm.jsx` already has the story `s` in scope. A row whose criterion cannot be located keeps returning `null` (so it is listed below the criteria), replacing the `n > s.criteria.length` check in the form.

**Batch apply inside `applySuggestions`.** The unit's rows are validated against the story as it is before any edit, then edited in the existing order. Within one unit a replace changes a criterion's text, so a later row in the same unit may no longer find it by text. In `editExisting`, when `locateCriterion` finds nothing, fall back to the slot named by the label, which is the current behavior and is correct under the existing order. The up-front state check has already confirmed each row against the unedited story.

## Risks / Trade-offs

- [Two criteria with the same text, neither at the named slot] → the row is stale, never guessed; the user dismisses it or applies it by hand.
- [A criterion reworded by hand to text that equals another row's `Current`] → matches only on exact equality, which is the intended meaning of "the same criterion".
- [Form placement now depends on the story, not just the unit] → `criterionNumberOf` gets a second argument; its only caller is `StoryForm.jsx`.

## Migration Plan

None. Existing review files keep working: a row whose slot still matches resolves exactly as before.
