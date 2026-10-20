## 1. Pure helper

- [x] 1.1 Add `core/panel-size.js` with `clampWidth` and `parseStoredWidth`, and `test/panel-size.test.mjs` (in range, below min, above max, `abc`, `null`, `NaN`, decimals); verify `node --test test/panel-size.test.mjs` passes

## 2. Shared pieces

- [x] 2.1 Add `hooks/usePanelSize.js` (single width by key, reads and writes `localStorage` inside try/catch, falls back to the default, `reset`) and verify by reading a stored `abc` value in the browser console check of task 5.3
- [x] 2.2 Add a column-widths variant that holds one object for all Stories columns and writes on drag end, and verify that dragging writes one `localStorage` entry per column changed
- [x] 2.3 Add `components/ResizeHandle.jsx` (pointer capture, live delta, commit on release, double-click reset, separator role and aria values) and verify with the checks of 3.x and 4.x

## 3. List panel on the three tabs

- [x] 3.1 In `tool.css`, make the `.editor` list track `var(--list-width, 260px)`, position the handle on the list panel's right edge, and hide it with the existing 800px media query; verify the layout is unchanged at default width
- [x] 3.2 Wire the Editor tab (`App.jsx`) with key `editor`; verify dragging resizes the list, double-click resets, and a reload keeps the width
- [x] 3.3 Wire `ProposedTab.jsx` with key `proposed` and `LexiconTab.jsx` with key `lexicon`; verify each tab keeps its own width and the others stay unchanged

## 4. Stories table columns

- [x] 4.1 Switch `.stories-table` to `table-layout: fixed` with a `<colgroup>`, default widths, ellipsis cells and `title` attributes; verify long Epic, Feature and Title text is cut with an ellipsis and the full text shows on hover
- [x] 4.2 Add a `ResizeHandle` to every header except the selection column, beside the sort button; verify dragging changes only that column, never sorts, and clicking the sort button still sorts
- [x] 4.3 Verify double-click fits one column to its widest text (up to the maximum) and takes the room it needs from Depends On, Title, Feature, Epic, Priority, Points and ID in that order, the table fills its container on a wide window, and a reload keeps the widths

## 5. Checks

- [x] 5.1 Run `npm test` and `npm run build`; verify both pass
- [x] 5.2 Manual: at 1920px, 1280px and just above 800px, drag to the min and max on each tab and verify the form never overflows or disappears; at 800px or less verify there is no divider
- [x] 5.3 Manual: set a stored width to `abc` and to `99999` in DevTools and verify the default and the maximum are used; block site storage and verify the page still works
- [x] 5.4 Update the `user-story-generator` line in `CLAUDE.md` (frontend section) to mention the resize hook and `core/panel-size.js`; verify the text matches the files
