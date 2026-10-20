## Why

The Editor tab's story panel lets you fold one epic or one feature at a time. On a backlog with many epics and features, getting an overview, or getting back to one, means clicking every head. The folds also reset whenever the page reloads, so the overview has to be rebuilt each session.

## What Changes

- Add two toggle buttons to the Editor tab's story panel: **Collapse epics** / **Expand epics** and **Collapse features** / **Expand features**. A button reads "Collapse" while any group of its level is open and "Expand" when all are closed. Groups hidden inside a collapsed epic are counted.
- Collapsing all epics shows epic heads only. Collapsing all features keeps epics open and shows feature heads with no stories. Each button changes only its own level, so reopening one epic restores whatever its features were doing.
- Keep the collapse state per backlog in the browser, so it survives reloads and tab switches. A group that is new to the backlog starts open.
- Reveal one feature, and so its epic, when a story shows up inside a collapsed group: after **Add story**, after **Accept** from the Proposed tab (each accepted story's feature), and whenever the selected story's Epic or Feature changes in the form. Every other group keeps its state.
- The Proposed tab's story list is unchanged: no bulk buttons, no stored state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: adds the requirement "Collapse and expand story groups" (bulk toggles, remembered state, reveal rule). The existing "Story list grouped by epic" and "Reorder groups by drag and drop" requirements are unchanged.

## Impact

- `app/frontend/user-story-generator/components/StoryList.jsx`: the closed-key set moves out, and the bulk buttons and the state become opt-in props (the Proposed tab keeps its own local state).
- `app/frontend/user-story-generator/hooks/useCollapsed.js` (new): closed keys, toggles, `reveal`, and the browser store, following `usePanelSizes.js`.
- `app/frontend/user-story-generator/App.jsx`: holds the hook, calls `reveal` from `addStory`, `accept` and on a change of the selected story's Epic or Feature.
- `app/frontend/user-story-generator/tool.css`: styles for the buttons.
- `core/`: a small pure helper for the keys and the toggle rules, so it can be tested (the repo tests only pure modules).
- `CLAUDE.md`: one line about the new hook and its storage key.
- No change to the CSV format, the backend, or the saved backlog.
