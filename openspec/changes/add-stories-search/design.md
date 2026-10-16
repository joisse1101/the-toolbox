## Context

`StoriesTab.jsx` renders `displayOrder(stories)` and derives select-all, shift-range and the "N selected" count from that list. Selection (`checked`, `lastChecked`) lives in the `useBacklog` reducer; the `checkAll` action replaces the whole set with the ids it is given. The Lexicon tab already filters with a trimmed, lowercased `includes` held in component state.

## Goals / Non-Goals

**Goals:** find a story by text in any field without leaving the overview; keep bulk editing predictable while a filter is on.

**Non-Goals:** field-specific search, regex, highlighting matches, persisting the query, filtering the Editor list or Graph.

## Decisions

- **Pure matcher in `core/`** (`story-search.js`: `matchesQuery(story, query)`). It splits the query on whitespace, lowercases, and requires every word in a haystack built from the live story fields (code, epic, feature, title, points, priority, notes, dependencies), `storyCellText`, `criteriaCellText` and `clarificationsCellText`, plus the `story.cells` of columns the tool does not know (so it takes the backlog `headers`). Known columns are not read from `cells`, which the model rebuilds only on save and would match stale text after an edit. Empty query matches everything. Core stays free of DOM so it is unit-tested like the other modules. Alternative considered: list fields by hand; rejected because it silently misses unknown columns.
- **Query is local `useState` in `StoriesTab`**, as in the Lexicon tab. Not persisted, so the tab opens unfiltered.
- **Filtering happens on `rows`** in `StoriesTab`: `rows` becomes the visible rows, so select-all, shift-range and the empty message follow the filter without further changes. The total stays `displayOrder(stories).length`.
- **Selection semantics (user decision: visible rows only, plus a hidden count):**
  - `checkAll` in the reducer changes from replacing the set to adding or removing the given ids, leaving other ticks alone. Without a query it still selects or clears every story, so existing behavior is unchanged.
  - The select-all box is checked when every visible row is ticked and indeterminate when some are; it is disabled when no rows are visible.
  - Shift-range slices the visible id list; if the anchor is hidden, the range falls back to the single row (existing behavior when the anchor is not in the list).
  - Hidden count = selected stories not in the visible rows; shown next to "N selected" only when above zero.
  - Bulk edit and lock/unlock keep acting on the full `checked` set; the confirm text already names the total N, which stays honest.
- **Count and empty message:** "N of M stories" appears only while a query is active; with zero matches the existing empty paragraph says "No story matches “query”." (versus "No stories yet." for an empty backlog).

## Risks / Trade-offs

- Hidden ticked stories can still receive a bulk edit -> mitigated by the hidden count and the confirm dialog naming the full total.
- Searching composed texts on every keystroke costs O(stories x text); backlogs are small (hundreds), so no debounce or index. Revisit only if it lags.
