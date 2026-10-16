## Why

The Stories tab is the overview of a whole backlog, but finding a story in it means scanning every row by eye. The table shows only seven columns, so a word that lives in a story's user story, acceptance criteria, notes or clarifications cannot be found at all. The Lexicon tab already has a search; the Stories tab needs the same.

## What Changes

- Add a search box above the Stories table. A story stays in the table when every space-separated word of the query appears (case-insensitive) in any of its fields: all CSV columns, including unknown ones, and the User Story, acceptance criteria and clarifications text.
- Show "N of M stories" next to the box while a query is active, and "No story matches ..." when nothing matches.
- While a filter is active, select-all and shift-range selection act on the visible rows only; select-all adds the visible rows to the selection and unticking it removes only those.
- The "N selected" status also shows how many selected stories are hidden by the filter.
- The query is plain tab state: not saved, and the Editor tab's story list is not filtered.
- A pure matcher in `core/` with unit tests.

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-story-editor`: the "Stories tab" and "Multi-select in the Stories tab" requirements gain search and filter-aware selection.

## Impact

- `core/` gains a small pure module for matching a story against a query (tested in `test/`).
- `app/frontend/user-story-generator/components/StoriesTab.jsx`: search input, filtered rows, count, filter-aware select-all and shift-range.
- `app/frontend/user-story-generator/hooks/useBacklog.js`: `checkAll` must add or remove only the given ids instead of replacing the whole selection.
- No change to the CSV format, the backend or the skills.
