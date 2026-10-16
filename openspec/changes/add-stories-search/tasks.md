## 1. Matcher (core)

- [x] 1.1 Add `core/story-search.js` with `matchesQuery(story, query)`: whitespace-split, case-insensitive, all words must appear in the story's cells plus its composed User Story, criteria and clarifications text; blank query matches
- [x] 1.2 Add `test/story-search.test.mjs`: match in a hidden column (criteria, notes), unknown column, case-insensitivity, all-words rule across fields, extra spaces, blank query, no match

## 2. Selection

- [x] 2.1 Change the `checkAll` reducer case in `hooks/useBacklog.js` to add or remove only the given ids (keep `lastChecked: null`)
- [x] 2.2 Add a reducer test in `test/reducer.test.mjs`: select-all with a subset keeps other ticks; clearing a subset keeps hidden ticks; full-set behavior unchanged

## 3. Stories tab UI

- [x] 3.1 Add the search input and `query` state to `StoriesTab.jsx`; filter `rows` with `matchesQuery`; show "N of M stories" while a query is active
- [x] 3.2 Show "No story matches “query”." when the filter leaves nothing, keeping "No stories yet." for an empty backlog
- [x] 3.3 Show the hidden-selected count next to "N selected" when selected stories are not in the visible rows; check select-all indeterminate/checked state against visible rows
- [x] 3.4 Style the search row in `tool.css` using existing tokens and the Lexicon search layout

## 4. Verify

- [x] 4.1 Run `npm test` and `npm run build`
- [ ] 4.2 Try it in the browser: search a field not in the table, an unknown column, select-all and shift-range with a filter, hidden count, bulk edit confirm total, clearing the query, Editor list unfiltered
