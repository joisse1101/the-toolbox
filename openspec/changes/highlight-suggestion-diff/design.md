## Context

`Suggestion` (`Suggestions.jsx`) renders a row's `suggested` text in a `<pre>`; the story form collects all `User Acceptance Criteria` units into one `SuggestionList` under the criteria. A `replace` row already carries `current` (filled by `fillCurrent` in `core/review.js`; for a criterion it is `AC<n>: Given …, when …, then …`, the same shape as `suggested`). The criterion a row names is parsed from its `suggested` label (`AC_NUMBER`/`AC_LABEL`), which `review.js` already uses for the stale check and Apply. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One pure, tested word diff reused by the form and the Review tab.
- Criterion suggestions rendered under their criterion without changing how units are built, applied or dismissed.

**Non-Goals:**
- Character-level diffs, diffs for `append`/`add`/`remove` values, a diff library, or any change to the review CSV, writer or skills.

## Decisions

- **Word diff in `core/word-diff.js`**: `wordDiff(old, new)` returns `[{ text, kind }]`, `kind` being `'same' | 'added' | 'removed'`. Tokenize on whitespace (keeping the separators so output rejoins to the text), then a longest-common-subsequence over tokens compared with whitespace-normalised equality. About 25 lines, no dependency. Alternative: add `diff` from npm; rejected as YAGNI for one-sentence strings, and core/ stays dependency-free.
- **Which rows get a diff**: `action === 'replace'` with a non-empty `current`. Everything else keeps the plain `<pre>`. `Suggestion` decides this, so the Review tab gets it with no extra code.
- **Rendering**: added -> `<mark>`, removed -> `<del>`, styled with existing CSS variables in `tool.css`. The text stays inside the `suggestion-value` `<pre>`, so layout and wrapping are unchanged.
- **Placing criterion units**: a helper in `core/review.js` returns the criterion number a unit names (`replace`/`remove` on `User Acceptance Criteria`, ungrouped), or `null`. `StoryForm` renders `SuggestionList` of the units for number `i+1` inside the criterion's block, below its fields, and the remaining criteria units (adds, numbers beyond the criteria count, grouped rows) in the existing list below the criteria. The `.criterion` block is a 3-column grid, so the per-criterion list goes in a wrapper that spans all columns. Pure helper -> node-testable; the JSX only calls it.
- **Stale and drag**: the units' state logic is untouched; a stale unit shows under its criterion with its existing "Out of date" text. Suggestions sit inside the draggable row's container but only the handle is `draggable`, so dragging is unaffected. Reordering by drag makes a unit follow its number, not the criterion text; `unitState` already marks it stale when the text no longer matches, so this is safe.

## Risks / Trade-offs

- [LCS cost on long text] -> fields are single sentences or short paragraphs; quadratic over tokens is negligible, and no input is user-supplied at scale.
- [Reordering criteria moves a suggestion to a different criterion] -> the stale check already flags a mismatch between `current` and the live `AC<n>`, so the unit is shown stale, not applied wrongly.
- [Diff of a fully rewritten text is mostly red/green] -> acceptable; it still shows the whole change.
