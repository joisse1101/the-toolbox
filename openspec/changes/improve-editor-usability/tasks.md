## 1. Completeness model

- [x] 1.1 Add `storyIssues(story)` to `public/user-story-generator/model.js` returning `{ errors, warnings }` per the completeness requirement; verify with unit tests in `test/model.test.mjs` covering each scenario (missing capability, half-filled criterion, missing points/priority only, red plus >13 points, complete story, raw-text cells counted as present)
- [x] 1.2 Add a `storyLabel(story)` helper (`capability: feature`, single part alone, "New story") and test the three cases
- [x] 1.3 Verify an all-blank criterion still serialises to an empty Acceptance Criteria cell (test in `test/model.test.mjs`); fix `composeCriteria` handling if not

## 2. Story list and form indicators

- [x] 2.1 Add `--bad-bg` / `--bad-border` tokens for light and dark in `public/shared/style.css` and an `incomplete` style for list rows and the form in `tool.css`; verify visually in both colour schemes
- [x] 2.2 Update `renderStoryList` to use `storyLabel`, apply `incomplete` before `split`/warning classes, and set the row `title` to the composed user story plus issue lines; verify by hovering a row and checking red wins on a story that is both incomplete and >13 points
- [x] 2.3 Add a red banner above the existing yellow warning in the form, filled from `storyIssues` and hidden when empty; extend the yellow banner to cover missing points/priority; verify each banner appears and disappears as fields are edited

## 3. Acceptance criteria behaviour

- [x] 3.1 Disable the remove button when only one criterion remains (with explanatory title); verify it cannot be clicked on the last criterion
- [x] 3.2 Seed one blank criterion at display time for a loaded story with an empty cell and no raw text, without `markDirty()`; verify the file on disk is unchanged after merely opening the story
- [x] 3.3 Enter in a Then input adds a criterion and focuses the new When input (ignore IME composition and modified Enter); verify by typing in the last Then field and pressing Enter, then pressing Enter in a Then field in the middle of the list

## 4. Suggestions

- [x] 4.1 Add three `<datalist>` elements to `index.html` linked to Epic, Capability and Feature, and build them from the current backlog (distinct, trimmed, non-blank), with Capability filtered by Epic and Feature by Epic plus Capability; verify with a backlog containing two epics that Capability shows only the selected epic's values
- [x] 4.2 Refresh the lists when the selected story, Epic or Capability changes, and when stories are added or deleted; verify a value typed on one story is offered on another

## 5. Shortcuts and helper

- [x] 5.1 Create the shortcut table and a single `keydown` handler for Alt+N, Alt+Shift+N, Alt+D, Ctrl+Up and Ctrl+Down (match on `e.code`, call `preventDefault` only when the shortcut applies); verify each action works while a text field has focus and that nothing happens with no backlog or at list edges
- [x] 5.2 Make Alt+N, Alt+Shift+N and Alt+D reuse the existing add/new/delete code paths; verify delete still asks for confirmation and a new backlog still focuses the file name
- [x] 5.3 Keep focus in the current form field after Ctrl+Up/Down, falling back to Epic; verify while editing Notes and with nothing focused
- [x] 5.4 Add the "Shortcuts" button and popover to the header, generated from the shortcut table, with Option labelling on Mac; generalise the existing pin / outside-click / Escape handling to both popovers; verify hover, keyboard focus, click-to-pin and Escape for both the shortcuts and the guideline popovers
- [ ] 5.5 Manually verify Alt+N, Alt+Shift+N and Alt+D are not intercepted by the browser in Chrome, Edge and Firefox

## 6. Layout

- [x] 6.1 Override the page width in `tool.css` for the generator only (no max width, 16px side padding); verify at 1920px and 800px wide, and that the tool index page is unchanged

## 7. Wrap up

- [x] 7.1 Run the existing test suite and confirm it passes; update README shortcut/behaviour notes if it describes the editor
