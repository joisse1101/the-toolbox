## Why

The story panel is a flat list that scrolls sideways when titles are long, so a backlog is hard to scan and there is no way to see the stories together or fix many at once. Re-prioritising or moving a dozen stories to another epic currently means editing them one by one.

## What Changes

- Story panel groups stories under a subheader per epic (stories with no epic go under "(No epic)").
- Story panel no longer scrolls sideways: long titles are cut with an ellipsis, and the panel uses a smaller font to fit more text.
- Previous/next story (Ctrl+Up / Ctrl+Down) follows the order shown in the panel instead of file order. The CSV row order is unchanged.
- New **Stories** tab beside the existing editor view: a table of every story (epic, capability, feature, points, priority) with a checkbox per row, select-all and shift-click range selection.
- Bulk edit bar on the Stories tab to set priority, epic and capability on all selected stories. A blank epic or capability box and the priority "no change" choice leave that field alone. Applying asks for confirmation first; there is no undo.
- Clicking a row's title in the Stories tab opens that story in the editor tab. The Stories tab does not edit individual stories.

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-story-editor`: story list becomes grouped by epic with no horizontal scroll, navigation follows displayed order, and a new Stories tab with multi-select and bulk edit is added.

## Impact

- `public/user-story-generator/index.html`, `app.js`, `tool.css`, and `model.js` (pure helpers for display order, grouping and bulk apply).
- No change to the CSV format, file store or auto-save; bulk edits go through the existing save path.
