## Context

- `.editor` in `tool.css` is a grid with `grid-template-columns: 260px 1fr`. The Editor tab (`App.jsx`), the Proposed tab (`ProposedTab.jsx`) and the Lexicon tab (`LexiconTab.jsx`) each render their own `.editor`, so each already has its own element to size. Below 800px the grid is one column.
- The Stories tab table (`StoriesTab.jsx`) uses `width: 100%` and auto table layout, with the column list in a `COLUMNS` array and sort buttons in the headers.
- The frontend has no `localStorage` use; the backend only serves CSV stores. Tests cover only pure modules.

## Goals / Non-Goals

**Goals:**
- Drag to resize the list panel (3 tabs, independent) and the Stories table columns.
- Persist widths per browser, reset by double-click, safe against bad or unavailable storage.
- Keep the clamping and parsing rules testable.

**Non-Goals:**
- Syncing widths across browsers or machines, or storing them in `data/`.
- Resizing the form, the Graph, Review or Backups tabs, or reordering/hiding columns.
- Touch or keyboard-only resizing beyond what a pointer drag gives (keyboard arrows on the focused handle are a possible later addition).

## Decisions

1. **Pure helper in `core/panel-size.js`** (`clampWidth(value, min, max)`, `parseStoredWidth(raw, {min, max, fallback})`). No DOM, no storage, so `test/panel-size.test.mjs` covers clamping, non-numbers, `NaN`, out-of-range and rounding. Alternative: keep it inside the hook; rejected because the repo's convention is to test pure logic and the rule is shared by both features.
2. **One hook, `hooks/usePanelSize.js`**, owns `localStorage` access (every read/write in try/catch, state kept in memory when storage throws) and returns `[width, setWidth, reset]` for a key. Keys: `tlt.listWidth.editor|proposed|lexicon` and `tlt.colWidth.<column key>`. A column table uses the same hook once per column through a small `useColumnWidths(keys)` wrapper, so one state object per table and one storage write per drag end, not per move.
3. **One `ResizeHandle.jsx` component** for both uses. It uses pointer events with `setPointerCapture` (no document-level listeners to clean up), reports the delta to the caller during the drag, commits on release, resets on double-click, and has `role="separator"` with `aria-orientation="vertical"`, `aria-valuenow/min/max`, and `tabIndex` so Left/Right arrows could be added cheaply.
4. **List width via a CSS variable.** `.editor` keeps two grid tracks, `var(--list-width, 260px) 1fr`, and the hook sets `--list-width` inline. The handle is absolutely positioned on the list panel's right edge, inside the existing 12px gap; a separate third grid track for it was rejected because it would shift the form. The existing `@media (max-width: 800px)` rule already sets `.editor { grid-template-columns: 1fr }`, which overrides the variable, and it also hides the handle, so the 800px breakpoint stays the one existing value in the CSS.
5. **Table columns: `table-layout: fixed` with a `<colgroup>`.** Fixed layout is what makes a width stick; each `<col>` gets its stored width or a default, the table gets `width: 100%` and the sum of the widths as its `min-width`, with one extra empty `<col>` (no width) at the right that absorbs the slack, so the table fills its container and a drag still moves only its own column, and `.table-wrap` keeps its `overflow-x: auto` only for a container narrower than the minimum widths. `fitWidths` in `core/panel-size.js` scales the stored widths down to the container width (measured with a `ResizeObserver` on `.table-wrap`) for display; a drag or fit sets the shown widths of all columns, with the dragged one capped at the room the others leave. Cells get `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` and a `title` with the full text. Default widths are chosen to look close to today's layout (ID ~90px, Epic/Feature ~160px, Title the widest, Points ~70px, Priority ~90px, Depends On ~140px); the selection column stays 28px and has no handle. Double-clicking a handle fits the column: the widest text of its header and cells is measured with a canvas using the cell's computed font, plus padding, and clamped to the limits. The handle sits in the `<th>` beside, not inside, the sort button, and stops click propagation so a drag never sorts.
6. **Limits:** list 180-600px, default 260px (so the form keeps room even on a 1280px window); columns 48-800px. These are constants next to the hook, not user settings.

## Risks / Trade-offs

- Fixed table layout means a very long title is now truncated where it used to wrap or widen the table. The tooltip and a draggable Title column are the mitigation; this is the behavior the spec states.
- `localStorage` is per browser and per origin: another port (`PORT` env) or a cleared profile resets widths. Accepted; it is a view preference.
- The list max (600px) could exceed the room on a small window just above 800px; the grid's `1fr` form track has `min-width: 0`, so it shrinks instead of overflowing. Verified in the manual check task.
- No DOM tests exist, so the drag behavior is checked by hand (tasks 5.x); only the pure helper has automated tests.
