## 1. Model helpers

- [x] 1.1 Add `groupByEpic(stories)` and `displayOrder(stories)` to `model.js` (first-occurrence group order, backlog order within a group, blank epic → "(No epic)") and verify with a quick Node check of the interleaved Billing/Onboarding example
- [x] 1.2 Add `applyBulk(stories, ids, { priority, epic, capability })` to `model.js` (only defined fields set, blank epic/capability ignored, `''` priority clears) and verify with a Node check that unselected stories and untouched fields are unchanged

## 2. Story panel

- [x] 2.1 Render the panel grouped by epic with non-clickable subheaders, using `groupByEpic`; verify stories appear under the right epic and "(No epic)" shows for blank epics
- [x] 2.2 Update `tool.css`: smaller list font and padding, `overflow-x: hidden`, `min-width: 0` on titles; verify in the browser that long titles show an ellipsis and no horizontal scrollbar appears
- [x] 2.3 Make `moveSelection` use `displayOrder`; verify Ctrl+Down on file order A(Billing), B(Onboarding), C(Billing) goes A → C → B
- [x] 2.4 Verify the CSV row order is unchanged after editing a story's epic and saving

## 3. Tabs

- [x] 3.1 Add Editor/Stories tab buttons and a Stories section to `index.html`, with `state.view` toggling visibility; verify switching tabs does not reload or alter the backlog
- [x] 3.2 Render the Stories table (Epic, Capability, Feature, Sprint points, Priority) in display order with red/yellow row styles and tooltips; verify against a backlog with incomplete and large stories
- [x] 3.3 Clicking a title in the table selects that story and switches to the Editor tab; verify
- [x] 3.4 Keep the table in sync when stories change in the Editor tab; verify a priority change shows after switching tabs

## 4. Multi-select and bulk edit

- [x] 4.1 Add per-row checkboxes, select-all, shift-click range select and a "N selected" count backed by a `Set` of ids on `state`; verify select-all, range and persistence across tab switches, and that deleted stories drop out
- [x] 4.2 Add the bulk bar (Priority with "No change"/"None", Epic and Capability inputs with backlog suggestions), shown only with a selection and Apply disabled until a field is set; verify each state
- [x] 4.3 Wire Apply: confirm naming the fields and count, call `applyBulk`, `markDirty()`, re-render, reset the bar, keep the selection; verify cancel changes nothing and confirm saves to the CSV

## 5. Wrap-up

- [x] 5.1 Update the shortcuts helper text only if wording changes (Ctrl+Up/Down follow the shown order) and verify the popover
- [x] 5.2 Manual pass in the browser on a multi-epic backlog covering the spec scenarios, including a narrow window
