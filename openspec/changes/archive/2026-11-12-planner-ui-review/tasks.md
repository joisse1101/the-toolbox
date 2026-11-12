# Tasks

Browser checks use `playwright-cli` against a scratch copy of `planner/test/sample-data/` under `.scratch/`, served with `PLANNER_CONFIG` pointing at a scratch config. Never use the real `planner/data/`.

## 1. Visual system

- [x] 1.1 Add the type, spacing, radius, shadow, grey and accent scales to `planner/portal/web/shared/style.css` and verify `npm run build` passes and the old colour variables still resolve.
- [x] 1.2 Convert `shared/style.css` and `backlog-portal/tool.css` to the scales: no `font-size` below 12px or in `em`, no weight below 400, and verify with a search of both files that no one-off size is left.
- [x] 1.3 Add hover, selected-row tint, disabled and focus-ring styles, with a disabled control not reacting to hover, and verify in the browser on the Stories table and the toolbar.
- [x] 1.4 Make the sort arrow appear only on the sorted column, with `aria-sort`, and fix the ID, Points and Depends On column widths, and verify at 900px that no ID or header is clipped.
- [x] 1.5 Fix the 390px layout (tab bar scrolls inside its own box, controls wrap in groups) and centre content with a maximum width above 1400px, and verify at 390px that the page does not scroll sideways.
- [x] 1.6 Make the Graph tab fit on first show and on canvas resize, clamped between 11px node text and 150%, and verify by resizing from 1440px to 900px and by opening a four-story graph.
- [x] 1.7 Measure the contrast of text, placeholder and disabled colours in light and dark mode, fix any pair under 4.5:1, and record the measured values in the commit message.
- [x] 1.8 Update `wiki/planner/architecture/Portal.md` with the scales and where they live, and verify `python scripts/check_docs.py` passes.

## 2. Keyboard access and non-colour cues

- [x] 2.1 Make story rows and Lexicon rows real buttons with a current marker, and verify in the browser that Tab and Enter open a story and a term.
- [x] 2.2 Build the tab list from one array with one Tab stop, arrow, Home and End keys, and a panel for every tab, and verify by keyboard that every tab can be reached.
- [x] 2.3 Rework `AddProjectDialog` (labelled mode group, focus in and back, Escape, error beside the field), and verify by keyboard.
- [x] 2.4 Give graph nodes, edges and canvas the shared focus ring, order nodes before edges, and add the legend, and verify by tabbing through the graph.
- [x] 2.5 Add a text or icon cue to incomplete and warning rows, missing fields (with `aria-invalid`), the selected graph node and failed saves, and verify the browser shows the word beside each.
- [x] 2.6 Add Move up and Move down buttons for acceptance criteria and stories, and verify by activating them in the browser.
- [x] 2.7 Make the server answer an empty file for a missing proposals, lexicon, lexicon-suggestions or review file when the folder exists, add a server test for it, and verify the test passes and the browser console shows no 404 on a stories-only backlog.
- [x] 2.8 Update `wiki/planner/architecture/Portal.md` for the file-API change and verify `python scripts/check_docs.py` passes.

## 3. Safe actions and shared patterns

- [x] 3.1 Add `ConfirmDialog` and `useConfirm()` on the native dialog element, and verify the dialog opens with Cancel focused, closes on Escape and returns focus.
- [x] 3.2 Replace every `confirm()` call (`App.jsx`, `LexiconTab.jsx`, `StoriesTab.jsx`, `useBacklog.js`, `useProposals.js`, `useAutosave.js`) one at a time with the dialog, and verify with a search that no `confirm(` remains and the pure-module tests still pass.
- [x] 3.3 Add the dialog before Proposed's Delete selected and Review's Clear all, and make the opening buttons plain and only the dialog's final button red, and verify in the browser that nothing is removed before confirming.
- [x] 3.4 Limit Stories bulk actions to visible rows with the hidden count shown, and add a test for the pure function that selects the rows, and verify the test passes.
- [x] 3.5 Make the bulk bar quiet until a row is ticked and drop its repeated filters, and verify in the browser with and without ticked rows.
- [x] 3.6 Add the shared tab header and `EmptyState`, use them in every tab (one empty message per tab, Clear filters in the Stories search), and verify each tab's empty state in the browser.
- [x] 3.7 Make repeated per-item Apply buttons secondary so each view has at most one primary button, and verify by listing the primary buttons on each tab in the browser.
- [x] 3.8 Group Settings under Project and Storage, make paths read-only but selectable with the full path available, move each risky action's explanation beside it, and verify in the browser at 900px.
- [x] 3.9 Update `wiki/planner/architecture/Portal.md` and `wiki/planner/User-Flows.md` for the dialog and tab pattern, and verify `python scripts/check_docs.py` passes.

## 4. Structure

- [x] 4.1 Count the lines and nesting of `GraphTab`, `StoryForm`, `StoriesTab` and `App`, and record the numbers as the starting point in the commit message.
- [x] 4.2 Add the Stack, Row and Grid layout helpers taking the spacing token, replace repeated flex rules and inline styles, and verify with a search that the inline `style=` uses named in the review are gone.
- [x] 4.3 Split `GraphTab` into toolbar, canvas, detail and unlinked list, and verify the Graph tab looks and behaves as before in a browser pass.
- [x] 4.4 Split `StoryForm` by section and move its arrow-key helper to its own module, and verify the form saves a story the same as before.
- [x] 4.5 Split `StoriesTab` into bulk bar, filter row and table, and verify filtering, sorting and bulk edit as before.
- [x] 4.6 Move `App`'s review, proposed and shortcut logic into hooks, make shortcuts ignore keys typed in a text field, and verify the shortcuts still work outside fields.
- [x] 4.7 Update `wiki/planner/architecture/Portal.md` with the new component layout and verify `python scripts/check_docs.py` passes.

## 5. Whole-change checks

- [x] 5.1 Run the project's own test commands for the whole change (`cd planner; npm test`, and `python scripts/check_docs.py` from the repo root) and fix any failure the change caused. Verify: `npm test` exits 0 and `check_docs.py` reports no problem.
