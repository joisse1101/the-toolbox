## Why

The story list panel is fixed at 260px and the Stories table sizes its columns from their content, so long Epic, Feature or Title text can crowd the other columns, and a long list title is cut off with no way to see more of it. The user wants to size these to suit their screen and backlog.

## What Changes

- The Editor, Proposed and Lexicon tabs get a draggable divider between the list panel and the form; each tab remembers its own list width.
- The Stories tab table gets a draggable handle on each column header; each column remembers its own width.
- Widths are stored in the browser's `localStorage` (per-machine view preference, not backlog data). Nothing is written to `data/`, and the backend is unchanged.
- Double-clicking a divider or column handle resets that width to its default.
- The divider is hidden when the layout stacks (window 800px wide or narrower).
- Min and max widths are enforced; a missing or invalid stored value falls back to the default.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: "Full-width generator layout" no longer says the list has a fixed width (it has an adjustable one with a 260px default); new requirements cover the resizable list panel on the Editor, Proposed and Lexicon tabs, and the resizable columns of the Stories tab.

## Impact

- `app/frontend/user-story-generator/`: `tool.css` (`.editor` grid, handles), `App.jsx`, `components/ProposedTab.jsx`, `components/LexiconTab.jsx`, `components/StoriesTab.jsx`, a new resize handle component and a hook that reads and writes `localStorage`.
- `core/`: one small pure module for clamping widths and parsing a stored value, with a test in `test/`.
- No backend, CSV, skill or MCP change; no new dependency.
