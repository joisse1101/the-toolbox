## ADDED Requirements

### Requirement: Story list grouped by epic
The story list SHALL group stories under a subheader per Epic, with each group's stories listed beneath its subheader. Groups SHALL appear in the order their epic first occurs in the backlog, and stories within a group SHALL keep their backlog order. Stories with a blank Epic SHALL be grouped under a subheader reading "(No epic)". The list SHALL use a smaller font than the rest of the page so more rows fit. The list SHALL NOT scroll sideways: a story title too long for the panel SHALL be cut off with an ellipsis, and the full text SHALL remain available in the row's tooltip. Grouping SHALL be display only and SHALL NOT change the order of rows in the saved file.

#### Scenario: Stories under their epic
- **WHEN** the backlog has stories in epics "Billing" and "Onboarding", interleaved in the file
- **THEN** the list shows a "Billing" subheader followed by its stories, then an "Onboarding" subheader followed by its stories

#### Scenario: No epic
- **WHEN** a story has a blank Epic
- **THEN** it is listed under a "(No epic)" subheader

#### Scenario: Epic edited
- **WHEN** the user changes the selected story's Epic from "Billing" to "Onboarding"
- **THEN** the story appears under the "Onboarding" subheader and remains selected

#### Scenario: Long title
- **WHEN** a story's label is wider than the list panel
- **THEN** the title is cut with an ellipsis, the list has no horizontal scrollbar, and hovering the row still shows the full tooltip

#### Scenario: File order unchanged
- **WHEN** the list is grouped differently from the file order and the backlog is saved
- **THEN** the CSV rows are written in their original order

### Requirement: Stories tab
The tool SHALL provide two tabs for an open backlog: **Editor**, showing the story list and story form, and **Stories**, showing every story of the backlog in one table. The table SHALL have a row per story with the columns Epic, Capability, Feature, Sprint points and Priority, and SHALL show the same completeness indicator (red or yellow, with the reasons in a tooltip) as the story list. Rows SHALL be ordered the same as the grouped story list. The Stories tab SHALL NOT allow editing a single story's fields. Clicking a story's title in the table SHALL select that story and switch to the Editor tab. Switching tabs SHALL NOT change or reload the backlog.

#### Scenario: Show all stories
- **WHEN** the user opens the Stories tab on a backlog with 12 stories
- **THEN** the table shows 12 rows with their epic, capability, feature, points and priority

#### Scenario: Open a story from the table
- **WHEN** the user clicks the title of a story in the table
- **THEN** the Editor tab is shown with that story selected

#### Scenario: Indicators in the table
- **WHEN** a story is missing its Capability
- **THEN** its table row is red and its tooltip names Capability

#### Scenario: Edits show in the table
- **WHEN** the user changes a story's Priority in the Editor tab and switches to the Stories tab
- **THEN** the table shows the new priority

### Requirement: Multi-select in the Stories tab
Each table row SHALL have a checkbox, and the header SHALL have a select-all checkbox that selects or clears every row. Shift-clicking a row's checkbox SHALL select every row between it and the last clicked checkbox. The tool SHALL show how many stories are selected. The selection SHALL be separate from the story selected in the Editor tab, and SHALL be cleared when another backlog is opened. Stories removed from the backlog SHALL drop out of the selection.

#### Scenario: Select several
- **WHEN** the user ticks three rows
- **THEN** "3 selected" is shown

#### Scenario: Select all
- **WHEN** the user ticks the header checkbox
- **THEN** every row is selected, and ticking it again clears them all

#### Scenario: Range select
- **WHEN** the user ticks the second row and then shift-clicks the checkbox of the fifth row
- **THEN** rows two to five are all selected

#### Scenario: Selection independent of the editor
- **WHEN** rows are ticked in the Stories tab and the user opens another story in the Editor tab and returns
- **THEN** the same rows are still ticked

### Requirement: Bulk edit selected stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Capability text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Capability fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Capability in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; on confirmation the tool SHALL set only the chosen fields on every selected story, leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Capability are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Capability are unchanged

#### Scenario: Change epic
- **WHEN** 4 stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Capability and Feature are unchanged, and the list shows them under "Billing"

#### Scenario: Change capability
- **WHEN** stories from two different epics are selected and Capability is set to "Invoices"
- **THEN** after confirming, all selected stories have Capability "Invoices"

#### Scenario: Clear priority
- **WHEN** Priority is set to "None" and applied with confirmation
- **THEN** the selected stories have an empty Priority

#### Scenario: Several fields at once
- **WHEN** Priority High and Epic "Billing" are both set and confirmed
- **THEN** both are applied to every selected story

#### Scenario: Nothing to apply
- **WHEN** stories are selected but Priority is "No change" and Epic and Capability are empty
- **THEN** the Apply button is disabled

#### Scenario: Confirmation
- **WHEN** the user clicks Apply with 12 stories selected and Epic set to "Billing"
- **THEN** a confirmation states that Epic will be set to "Billing" on 12 stories

#### Scenario: Cancelled
- **WHEN** the user cancels the confirmation
- **THEN** no story changes and nothing is saved

#### Scenario: Saved
- **WHEN** a bulk edit is confirmed
- **THEN** the save status shows saving and then saved, and the CSV contains the new values

#### Scenario: No selection
- **WHEN** no story is selected
- **THEN** the bulk edit bar is not shown

## MODIFIED Requirements

### Requirement: Keyboard shortcuts
The tool SHALL provide these keyboard shortcuts, active anywhere on the page including while a text field has focus: Alt+N adds a story, Alt+Shift+N creates a new backlog, Alt+D deletes the selected story, Ctrl+Up selects the previous story and Ctrl+Down selects the next story. Previous and next SHALL follow the order the stories are shown in the grouped story list, not the order of rows in the file. Each shortcut SHALL do exactly what the matching button or click does today, including the delete confirmation. A shortcut that has nothing to act on (no story selected, no backlog loaded, already at the first or last story) SHALL do nothing. The tool SHALL prevent the browser's default action for a shortcut it handles.

#### Scenario: Add story by keyboard
- **WHEN** a backlog is open and the user presses Alt+N
- **THEN** a blank story is appended, selected, and the Epic field has focus

#### Scenario: New backlog by keyboard
- **WHEN** the user presses Alt+Shift+N
- **THEN** a new backlog is created exactly as when clicking "New"

#### Scenario: Delete by keyboard
- **WHEN** a story is selected and the user presses Alt+D and confirms
- **THEN** the story is deleted and a neighbouring story is selected

#### Scenario: Move between stories
- **WHEN** the second of three stories is selected and the user presses Ctrl+Down
- **THEN** the third story is selected and its form is shown, and the focused form field keeps focus

#### Scenario: Move follows the grouped order
- **WHEN** the file has stories A (Billing), B (Onboarding), C (Billing) and A is selected, so the list shows A, C, B
- **THEN** pressing Ctrl+Down selects C, not B

#### Scenario: Edge of the list
- **WHEN** the first story is selected and the user presses Ctrl+Up
- **THEN** the selection does not change
