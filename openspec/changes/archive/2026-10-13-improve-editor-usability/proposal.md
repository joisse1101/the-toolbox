## Why

Writing a backlog story by story is slow with the mouse alone, easy to leave half-finished, and repeats the same Epic, Capability and Feature text by hand. The form is also squeezed into a narrow centred column on wide screens. These changes make the editor faster to drive, show at a glance which stories still need work, and use the screen properly.

## What Changes

- Keyboard shortcuts: Alt+N adds a story, Alt+Shift+N creates a new backlog, Alt+D deletes the selected story, Ctrl+Up / Ctrl+Down select the previous / next story. Ctrl+N, Ctrl+Shift+N and Ctrl+D are not used because browsers reserve them.
- Pressing Enter in a criterion's Then field adds a new criterion and moves focus to the When field of the new one.
- A "Shortcuts" helper in the page header that lists every shortcut in a hover/focus/click popover.
- Epic, Capability and Feature suggest values already used in the current backlog; Capability and Feature are narrowed by the chosen Epic (and Capability).
- Story list shows each story as `capability: feature`, with the user story as the hover tooltip.
- Story completeness indicators: a story is marked red when Epic, Capability, Feature, any user story part, or acceptance criteria are missing or blank; marked yellow when Sprint points or Priority is missing, or points are above 13. Red wins over yellow on the list row; the form shows both messages, red first.
- **BREAKING (behaviour)**: the last acceptance criterion of a story can no longer be removed; every story always has at least one criterion.
- The generator page uses the full window width instead of the 1100px centred column.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: adds requirements for keyboard shortcuts, the shortcuts helper, field suggestions, story completeness indicators and full-width layout; modifies "Multiple acceptance criteria" (minimum of one, Enter in Then adds a criterion) and "Multiple stories per backlog" (list label and tooltip).

## Impact

- `public/user-story-generator/app.js`, `index.html`, `tool.css`, `model.js` (completeness helper, pure and unit-testable) and `test/model.test.mjs`.
- `public/shared/style.css` gains red-state colour tokens (light and dark); the shared page width is left unchanged.
- No change to the CSV format or the server.
