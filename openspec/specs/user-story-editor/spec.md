## Purpose

Lets a team lead write and maintain user stories in a browser form, with each backlog stored as a CSV file in the `user-stories` folder that can also be opened directly in Excel.

## Requirements

### Requirement: Backlog file dropdown
The tool SHALL show a dropdown of the CSV files in `user-stories/` and load the chosen file's stories into the editor. It SHALL re-read the file from disk each time it is selected and when the browser tab regains focus.

#### Scenario: Files listed on load
- **WHEN** the tool opens and `user-stories/` contains `a.csv` and `b.csv`
- **THEN** the dropdown lists both and one is selected and loaded

#### Scenario: No files yet
- **WHEN** `user-stories/` contains no CSV files
- **THEN** the dropdown is empty and the editor prompts the user to create a new backlog

#### Scenario: File changed outside the tool
- **WHEN** the file is edited in Excel and saved, then the user returns to the tab
- **THEN** the tool reloads the file and shows the edited content

### Requirement: Story fields
For each story the tool SHALL provide: Epic, Capability and Feature as short text fields; "As a", "I want" and "So that" text fields; Sprint points as a row of one-click buttons (see "Sprint points selector"); and Priority as a dropdown with the options Critical, High, Medium and Low, plus an empty "none" choice. Priority SHALL be optional and new stories SHALL start with none selected. The tool SHALL also provide an optional multi-line free-text Notes field, stored as-is and not parsed.

#### Scenario: Notes field
- **WHEN** the user types several lines into Notes
- **THEN** the field accepts the line breaks and the text is saved unchanged in the `Notes` cell, and an empty Notes field saves as an empty cell

#### Scenario: Priority is optional
- **WHEN** a new story is created
- **THEN** Priority shows "none" and the story can be saved without one

#### Scenario: Priority value not in the list
- **WHEN** a loaded file has a Priority such as `Urgent` that is not one of the four options
- **THEN** the dropdown shows `Urgent` as an extra selected option and the value is written back unchanged unless the user picks another

### Requirement: Sprint points selector
Sprint points SHALL be chosen with a row of buttons, one per Fibonacci value: 1, 2, 3, 5, 8, 13, 21, 34 and 55. There SHALL be no free-text or number input for Sprint points. Clicking a button SHALL select that value; clicking the selected button again SHALL clear it. At most one value SHALL be selected, and the value SHALL be stored in the `Sprint points` cell as the plain number.

Values above 13 (21, 34 and 55) SHALL be visually marked as "consider splitting". When a story's points are above 13, the tool SHALL highlight that story both in the story list and on its form, with a message suggesting it be split, so it is noticeable at a glance. The highlight SHALL be advisory only and SHALL NOT block saving.

#### Scenario: Select points
- **WHEN** the user clicks the 5 button
- **THEN** 5 is shown as selected, the `Sprint points` cell becomes `5`, and clicking 8 moves the selection to 8

#### Scenario: Clear points
- **WHEN** the selected button is clicked again
- **THEN** no value is selected and the `Sprint points` cell is empty

#### Scenario: Large story highlighted
- **WHEN** the user selects 21
- **THEN** the story is highlighted in the story list and on the form with a "consider splitting" message

#### Scenario: Highlight removed
- **WHEN** the user changes the points from 21 to 8
- **THEN** the highlight and message disappear

#### Scenario: 13 is not flagged
- **WHEN** the user selects 13
- **THEN** no split highlight is shown

#### Scenario: Loaded value off the scale
- **WHEN** a loaded file has Sprint points such as `4`, which has no button
- **THEN** no button is shown as selected and no warning or hint is shown, the original value is written back unchanged unless the user clicks a button, and a value above 13 (such as `100`) is still highlighted for splitting

### Requirement: Sprint points estimation guideline
The tool SHALL show an info control next to the Sprint points field that reveals a shared estimation guideline. The guideline SHALL describe the Fibonacci scale (1, 2, 3, 5, 8, 13, and the split-warning values 21, 34, 55) and how to choose a value using complexity, effort, uncertainty/risk and reference stories, and SHALL state that a story estimated above 13 should be split. The guideline text SHALL come from an editable file in the repository, so changes to it appear in the tool without code changes. The control SHALL show the guideline on hover or keyboard focus and keep it open when clicked.

#### Scenario: Guideline on hover
- **WHEN** the user hovers or focuses the info control beside Sprint points
- **THEN** the guideline text is shown

#### Scenario: Guideline pinned
- **WHEN** the user clicks the info control
- **THEN** the guideline stays open until clicked again or dismissed

#### Scenario: Guideline file edited
- **WHEN** the guideline file is edited and the page is reloaded
- **THEN** the updated text is shown

#### Scenario: Guideline file missing
- **WHEN** the guideline file cannot be loaded
- **THEN** the info control shows a short message that the guideline is unavailable and the rest of the form still works
### Requirement: Multiple acceptance criteria
Each story SHALL support one or more acceptance criteria, each made of "Given", "When" and "Then" text fields. The user SHALL be able to add criteria and remove criteria, but SHALL NOT be able to remove the last remaining one: its remove control SHALL be disabled. A new story SHALL start with one empty criterion. A story loaded with an empty Acceptance Criteria cell SHALL show one empty criterion, without that alone causing the file to be saved. A story whose cell was kept as raw text because it did not parse SHALL be left as it is until the user edits its criteria. Pressing Enter in the Then field of a criterion SHALL add a new empty criterion after the last one and move focus to the When field of the new criterion.

#### Scenario: Add criterion
- **WHEN** the user clicks "Add criterion"
- **THEN** a new empty Given/When/Then group appears

#### Scenario: Remove criterion
- **WHEN** the user removes the second of three criteria
- **THEN** the remaining two are renumbered 1 and 2

#### Scenario: Last criterion cannot be removed
- **WHEN** a story has exactly one criterion
- **THEN** its remove control is disabled

#### Scenario: New story has a criterion
- **WHEN** a story is added
- **THEN** it shows one empty criterion group

#### Scenario: Loaded story without criteria
- **WHEN** a loaded story has an empty Acceptance Criteria cell
- **THEN** one empty criterion group is shown and the file is not rewritten until the user changes something

#### Scenario: Enter in Then adds a criterion
- **WHEN** the user presses Enter in the Then field of a criterion
- **THEN** a new empty criterion is added and its When field has focus

### Requirement: Multiple stories per backlog
A backlog file SHALL hold many stories, one per CSV row. The tool SHALL let the user add a story, switch between stories, and delete the selected story. In the story list each story SHALL be labelled `<capability>: <feature>`; if only one of them is filled it SHALL show that one alone, and if both are blank it SHALL show "New story". Hovering a story in the list SHALL show a tooltip with the composed user story, followed by any completeness or warning reasons.

#### Scenario: Add story
- **WHEN** the user adds a story
- **THEN** a blank story is appended to the backlog and selected

#### Scenario: List label
- **WHEN** a story has Capability "Invoices" and Feature "Export"
- **THEN** its list row reads "Invoices: Export"

#### Scenario: List label with one part
- **WHEN** a story has only a Feature "Export"
- **THEN** its list row reads "Export", without a colon

#### Scenario: Tooltip
- **WHEN** the user hovers a story that is missing its Epic
- **THEN** the tooltip shows the user story text and a line saying Epic is missing

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `Epic, Capability, Feature, User Story, Sprint points, Priority, Acceptance Criteria, Notes`.

- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel.

#### Scenario: Story sentence saved
- **WHEN** the user enters As a "team lead", I want "to export a backlog", so that "I can share it"
- **THEN** the `User Story` cell contains `As a team lead, I want to export a backlog, so that I can share it`

#### Scenario: Multiple criteria in one cell
- **WHEN** a story has two criteria
- **THEN** the `Acceptance Criteria` cell contains two lines beginning `AC1: Given ` and `AC2: Given `, separated by a line break

#### Scenario: Round trip
- **WHEN** a story containing commas, quotes and a line break in its text is saved and the file is reloaded
- **THEN** every field is identical to what was entered

#### Scenario: Story with no criteria
- **WHEN** a story has no criteria text
- **THEN** its `Acceptance Criteria` cell is empty

### Requirement: Parsing story and criteria text
When loading a file, the tool SHALL split the `User Story` cell into As a / I want / So that using the literal keywords `As a`, `I want` and `so that` (case-insensitive, first occurrence of each, in that order), and SHALL split the `Acceptance Criteria` cell into criteria by line, each into Given / When / Then using the keywords `Given`, `when` and `then` (case-insensitive, first occurrence of each, in that order). The comma immediately before a keyword SHALL be treated as a separator and removed from the preceding field, and a missing comma SHALL be tolerated. The leading `AC<n>:` label SHALL be ignored and criteria renumbered from their position.

#### Scenario: Comma-separated syntax
- **WHEN** a cell reads `As a team lead, I want to export, so that I can share`
- **THEN** the fields load as `team lead`, `to export` and `I can share`, with no trailing commas

#### Scenario: Missing commas tolerated
- **WHEN** a cell reads `As a team lead I want to export so that I can share`
- **THEN** it loads the same fields, and the next save rewrites it with commas

#### Scenario: Cell edited in Excel
- **WHEN** the `Acceptance Criteria` cell is edited in Excel and still follows the syntax
- **THEN** the tool loads each line into its own Given/When/Then group

#### Scenario: Text that does not match the syntax
- **WHEN** a `User Story` or criterion line does not contain its keywords in order
- **THEN** the tool shows a warning for that story, leaves the original cell text untouched on disk, and only replaces it if the user edits that group's fields

### Requirement: Live preview of story and criteria
Beneath the user story fields and beneath the acceptance criteria group, the tool SHALL show a read-only preview of the exact text that will be written to the corresponding CSV cell, updating as the user types.

#### Scenario: Story preview
- **WHEN** the user types into As a, I want or So that
- **THEN** the preview shows `As a …, I want …, so that …` with the entered text

#### Scenario: Criteria preview
- **WHEN** the user has two criteria
- **THEN** the preview shows two lines, `AC1: Given …, when …, then …` and `AC2: …`

### Requirement: Unknown columns are preserved
When a loaded CSV contains columns the tool does not recognise, the tool SHALL keep those columns and each row's values for them, and write them back unchanged when saving. Columns the tool recognises SHALL be matched by header name, not position.

#### Scenario: Extra column survives save
- **WHEN** a file with an extra `Jira Key` column is loaded, a story is edited and the file is saved
- **THEN** the saved file still contains the `Jira Key` column with its original values

#### Scenario: Reordered columns
- **WHEN** a file has the recognised columns in a different order
- **THEN** values load into the correct fields

### Requirement: Create a new backlog
The tool SHALL provide a "New" action that immediately creates a header-only CSV named `new-backlog.csv` (numbered if taken), selects it in the dropdown, and focuses its filename for renaming.

#### Scenario: First new backlog
- **WHEN** the user clicks New and `new-backlog.csv` does not exist
- **THEN** `new-backlog.csv` is created, selected, and its name is editable

#### Scenario: Name taken
- **WHEN** the user clicks New and `new-backlog.csv` exists
- **THEN** `new-backlog-2.csv` is created and selected

### Requirement: Rename a backlog
The tool SHALL let the user rename the selected backlog file. The dropdown SHALL update and the same backlog SHALL stay selected.

#### Scenario: Successful rename
- **WHEN** the user renames the file to `sprint-12`
- **THEN** the file on disk is `sprint-12.csv` and the dropdown shows it selected

#### Scenario: Rename rejected
- **WHEN** the rename fails (name taken or invalid)
- **THEN** the tool shows the reason and keeps the old name

### Requirement: Open folder
The tool SHALL provide an action that opens the `user-stories` folder in File Explorer.

#### Scenario: Open folder
- **WHEN** the user clicks "Open folder"
- **THEN** File Explorer opens at `user-stories/`

### Requirement: Auto-save
The tool SHALL save the current backlog to its CSV file automatically shortly after the user stops editing, with no Save button. It SHALL show a visible save status (saved, saving, or failed).

#### Scenario: Edit is saved
- **WHEN** the user edits a field and pauses
- **THEN** the CSV on disk reflects the edit and the status shows saved

#### Scenario: Save fails because file is locked
- **WHEN** a save fails because the file is open in another program
- **THEN** the status shows a failure message naming the cause, the unsaved edits remain in the form, and the tool retries until it succeeds

#### Scenario: Unsaved changes on close
- **WHEN** the user tries to close the tab while a save is pending or failed
- **THEN** the browser warns that changes are unsaved

### Requirement: Keyboard shortcuts
The tool SHALL provide these keyboard shortcuts, active anywhere on the page including while a text field has focus: Alt+N adds a story, Alt+Shift+N creates a new backlog, Alt+D deletes the selected story, Ctrl+Up selects the previous story and Ctrl+Down selects the next story. Previous and next SHALL follow the order the stories are shown in the grouped story list, not the order of rows in the file. Each shortcut SHALL do exactly what the matching button or click does today, including the delete confirmation. A shortcut that has nothing to act on (no story selected, no backlog loaded, already at the first or last story) SHALL do nothing. The story shortcuts (add, delete, previous and next) SHALL act only while the Editor tab is shown and do nothing on the Stories tab; Alt+Shift+N works on either tab. The tool SHALL prevent the browser's default action for a shortcut it handles.

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

#### Scenario: Story shortcuts on the Stories tab
- **WHEN** the Stories tab is shown and the user presses Alt+N, Alt+D, Ctrl+Up or Ctrl+Down
- **THEN** nothing happens

#### Scenario: Edge of the list
- **WHEN** the first story is selected and the user presses Ctrl+Up
- **THEN** the selection does not change

### Requirement: Shortcuts helper
The page header SHALL contain a "Shortcuts" control that shows a popover listing every keyboard shortcut and what it does. The popover SHALL open on hover and on keyboard focus, stay open when the control is clicked, and close on Escape or a click elsewhere. On Mac the Alt key SHALL be labelled Option.

#### Scenario: Open helper
- **WHEN** the user hovers over or focuses the "Shortcuts" control
- **THEN** a popover lists Alt+N, Alt+Shift+N, Alt+D, Ctrl+Up and Ctrl+Down with their actions

#### Scenario: Close helper
- **WHEN** the popover has been pinned open by a click and the user presses Escape
- **THEN** the popover closes

### Requirement: Epic, Capability and Feature suggestions
The Epic, Capability and Feature fields SHALL suggest values already used by stories in the currently open backlog, while still accepting any typed value. Epic SHALL suggest every distinct Epic. Capability SHALL suggest the distinct Capabilities of stories with the same Epic as the selected story. Feature SHALL suggest the distinct Features of stories with the same Epic and Capability. Blank values SHALL NOT be suggested.

#### Scenario: Epic suggestions
- **WHEN** the backlog has stories in epics "Billing" and "Onboarding" and the user focuses Epic on another story
- **THEN** "Billing" and "Onboarding" are offered

#### Scenario: Capability narrowed by epic
- **WHEN** the selected story has Epic "Billing" and "Billing" stories use capabilities "Invoices" and "Payments" while "Onboarding" uses "Signup"
- **THEN** Capability offers "Invoices" and "Payments" but not "Signup"

#### Scenario: New value
- **WHEN** the user types an Epic that no story uses
- **THEN** it is accepted and becomes a suggestion for other stories

### Requirement: Story completeness indicators
The tool SHALL classify each story. A story is **incomplete** (red) when any of Epic, Capability, Feature, As a, I want or So that is blank, or when it has no acceptance criterion, or when any of its criteria has a blank Given, When or Then. A story whose User Story or Acceptance Criteria cell could not be parsed and is kept as raw text counts that cell as present. A story gets a **warning** (yellow) when Sprint points is missing, Priority is missing, or Sprint points is above 13. The indicator SHALL show on the story's row in the story list and on its form, SHALL list the reasons, and SHALL be advisory only and SHALL NOT block saving. When a story is both incomplete and has warnings, the row SHALL use the red style; the form SHALL show the red message first and the yellow message after it.

#### Scenario: Missing capability
- **WHEN** a story has a blank Capability
- **THEN** its list row is red and its form shows a red message naming Capability

#### Scenario: Half-filled criterion
- **WHEN** a story's only criterion has Given and When filled but Then blank
- **THEN** the story is red with Acceptance criteria named as the reason

#### Scenario: Missing estimate only
- **WHEN** a story has every required field but no Sprint points and no Priority
- **THEN** its row is yellow and the form lists Sprint points and Priority as missing

#### Scenario: Red wins
- **WHEN** a story has a blank Epic and also 21 Sprint points
- **THEN** its row is red, and the form shows the red message followed by the "consider splitting" message

#### Scenario: Complete story
- **WHEN** all required fields, Sprint points and Priority are filled and points are 13 or less
- **THEN** the row and the form have no indicator

### Requirement: Full-width generator layout
The user story generator page SHALL use the full width of the browser window, with only a small side margin, instead of a narrow centred column. The story list SHALL keep a fixed narrow width and the story form SHALL take the remaining width. The layout SHALL remain usable on narrow windows.

#### Scenario: Wide window
- **WHEN** the window is 1920px wide
- **THEN** the story form spans the window except for the story list and a small margin on each side

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
