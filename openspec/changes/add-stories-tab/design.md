## Context

The generator is a static page (`index.html`, `app.js`, `model.js`, `tool.css`). `app.js` holds one `state` object, renders the story list with `renderStoryList()`, and saves every edit via `markDirty()`. `model.js` is pure (no DOM) and is the place for logic that should be easy to reason about. Stories live in `state.backlog.stories` in file order, and `serializeBacklog` writes them in that order. `moveSelection()` currently walks that array. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Group the panel by epic without changing the order of rows in the CSV.
- One source of truth for "the order stories are shown in", used by the panel, the Stories tab and Ctrl+Up/Down.
- Bulk edit that goes through the existing auto-save path.

**Non-Goals:**
- Inline editing in the Stories tab, sorting columns, filtering, or undo.
- Re-sorting or rewriting the file to match the grouped order.
- Collapsing/expanding epic groups.

## Decisions

**Display order is derived, never stored.** Add pure helpers in `model.js`: `groupByEpic(stories)` returns `[{ epic, label, stories }]` (groups in first-occurrence order, "(No epic)" for blank), and `displayOrder(stories)` is the flattened list. The panel, the table and `moveSelection` all call these. Alternative considered: sorting `state.backlog.stories` in place. Rejected because it would reorder the user's CSV on the next save and make diffs noisy.

**Epic grouping key is the trimmed epic text, compared exactly.** "Billing" and "billing" are separate groups, matching how suggestions already treat epics. Blank and whitespace-only epics share the "(No epic)" group. A group is identified by its epic text, so blank is represented as the empty string internally.

**No horizontal scroll via CSS.** Set `overflow-x: hidden` on the list and `min-width: 0` on the flex title so the existing `text-overflow: ellipsis` takes effect; the full text stays in the row `title` tooltip. Font size is reduced on the list only (about 12px with tighter row padding). Epic subheaders are non-selectable `li` elements (not `li[data-id]`) so the existing click handler ignores them.

**Tabs are two views of one backlog.** A `state.view` of `'editor' | 'stories'` toggles which section is visible; the file bar stays above both. The Editor view keeps the existing DOM. The Stories view is a new `<section>` containing the bulk bar and a `<table>`, rebuilt by a `renderStoriesTab()` called from `renderAll()` and wherever `renderStoryList()` is called after a data change, so both stay in sync. Tab buttons use `role="tablist"`/`tab` semantics.

**Multi-select state is a `Set` of story ids on `state`**, separate from `state.selectedId`. It is pruned against the current stories on every render (covers deleted stories) and cleared in `loadFile`/`clearCurrent` only when the file name changes, so a reload of the same file from disk keeps the selection where the ids still exist. Story ids are assigned per load and are not stable across a reload, so after a reload of the same file the set is simply cleared; this is acceptable since reload only happens when the file changed outside the tool. Shift-click range selection uses the last-clicked id and the table's displayed order.

**Bulk apply is a pure function.** `applyBulk(stories, ids, { priority, epic, capability })` in `model.js` sets only the defined fields and returns the count changed; `priority` uses `undefined` for "no change" and `''` for "None", and blank epic/capability strings are ignored. The UI builds the confirm message from the same patch, calls `applyBulk`, then `markDirty()` and re-renders. `confirm()` is used, matching the existing delete confirmation.

**Bulk Apply is disabled** until the patch has at least one field set, so a confirm is never shown for a no-op.

## Risks / Trade-offs

- [Selected story jumps position when its epic changes] → The selection is by id so it stays selected; the list just re-renders it under the new epic. Scroll position of the list may shift; accepted.
- [Large bulk edit applied by mistake] → Confirm dialog names the fields and count. No undo by decision; the CSV on disk can be restored from Excel/version control.
- [Table duplicates the list's indicator logic] → Both call `storyIssues`/`issueClass`, so there is one definition.
- [Epic typos create extra groups] → Existing epic suggestions reduce this; the bulk epic change is the fix for it.
