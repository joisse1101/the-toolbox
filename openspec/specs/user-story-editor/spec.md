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
For each story the tool SHALL provide: Epic, Feature and Title as short text fields, where Title is the title of the user story; "As a", "I want" and "So that" text fields; Sprint points as a row of one-click buttons (see "Sprint points selector"); and Priority as a dropdown with the options Critical, High, Medium and Low, plus an empty "none" choice. Priority SHALL be optional and new stories SHALL start with none selected. The tool SHALL also provide an optional multi-line free-text Notes field, stored as-is and not parsed.

#### Scenario: Notes field
- **WHEN** the user types several lines into Notes
- **THEN** the field accepts the line breaks and the text is saved unchanged in the `Notes` cell, and an empty Notes field saves as an empty cell

#### Scenario: Priority is optional
- **WHEN** a new story is created
- **THEN** Priority shows "none" and the story can be saved without one

#### Scenario: Priority value not in the list
- **WHEN** a loaded file has a Priority such as `Urgent` that is not one of the four options
- **THEN** the dropdown shows `Urgent` as an extra selected option and the value is written back unchanged unless the user picks another

#### Scenario: Hierarchy fields
- **WHEN** the user opens a story
- **THEN** the form shows Epic, Feature and Title, and no Capability field

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
Each story SHALL support one or more acceptance criteria, each made of "Given", "When" and "Then" text fields. The user SHALL be able to add criteria and remove criteria, but SHALL NOT be able to remove the last remaining one: its remove control SHALL be disabled. A new story SHALL start with one empty criterion. A story loaded with an empty User Acceptance Criteria cell SHALL show one empty criterion, without that alone causing the file to be saved. A story whose cell was kept as raw text because it did not parse SHALL be left as it is until the user edits its criteria. Pressing Enter in the Then field of a criterion SHALL add a new empty criterion after the last one and move focus to the When field of the new criterion.

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
- **WHEN** a loaded story has an empty User Acceptance Criteria cell
- **THEN** one empty criterion group is shown and the file is not rewritten until the user changes something

#### Scenario: Enter in Then adds a criterion
- **WHEN** the user presses Enter in the Then field of a criterion
- **THEN** a new empty criterion is added and its When field has focus

### Requirement: Multiple stories per backlog
A backlog file SHALL hold many stories, one per CSV row. The tool SHALL let the user add a story, switch between stories, and delete the selected story. A new story SHALL be appended to the end of the backlog. Deleting a story SHALL remove its ID from the `Depends On` of every other story and renumber the rest of its Epic as described in "Story IDs follow position". In the story list each story SHALL be labelled with its Title, and a story with a blank Title SHALL show "New story". Hovering a story in the list SHALL show a tooltip with the composed user story, followed by any completeness or warning reasons.

#### Scenario: Add story
- **WHEN** the user adds a story
- **THEN** a blank story is appended to the backlog and selected

#### Scenario: Delete removes references
- **WHEN** story `IAM-0001` is deleted and `IAM-0003` depended on it
- **THEN** `IAM-0003` no longer lists `IAM-0001` in its dependencies

#### Scenario: List label
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its list row reads "Local Login"

#### Scenario: List label with one part
- **WHEN** a story has a Feature "Authentication" but a blank Title
- **THEN** its list row reads "New story"

#### Scenario: Tooltip
- **WHEN** the user hovers a story that is missing its Epic
- **THEN** the tooltip shows the user story text and a line saying Epic is missing

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria, Notes, Locked, Clarifications`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `User Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Locked` SHALL hold `Yes` for a locked story and be empty otherwise. Any other value SHALL be read as unlocked.
- `Clarifications` SHALL hold the story's question and answer pairs in the form defined by the `story-clarifications` capability, or be empty.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title`, `Locked` or `Clarifications` column SHALL be accepted and the columns added to it when it is saved. The tool SHALL NOT translate older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As a "team lead", I want "to export a backlog", so that "I can share it"
- **THEN** the `User Story` cell contains `As a team lead, I want to export a backlog, so that I can share it`

#### Scenario: Multiple criteria in one cell
- **WHEN** a story has two criteria
- **THEN** the `User Acceptance Criteria` cell contains two lines beginning `AC1: Given ` and `AC2: Given `, separated by a line break

#### Scenario: Round trip
- **WHEN** a story containing commas, quotes and a line break in its text is saved and the file is reloaded
- **THEN** every field is identical to what was entered

#### Scenario: Story with no criteria
- **WHEN** a story has no criteria text
- **THEN** its `User Acceptance Criteria` cell is empty

#### Scenario: ID and dependencies saved
- **WHEN** story `IAM-0003` depends on `IAM-0001` and `DD-0002`
- **THEN** its row has `IAM-0003` in `ID` and `IAM-0001;DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On`, `Title`, `Locked` and `Clarifications` columns is opened and saved
- **THEN** the saved file has all five columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

#### Scenario: Lock saved and reloaded
- **WHEN** a locked story is saved and the file is reloaded
- **THEN** the story is still locked

#### Scenario: Clarifications saved
- **WHEN** a story with a question and its answer is saved and the file is reloaded
- **THEN** the `Clarifications` cell holds `Q1: ...` and `A1: ...` lines and the story shows the same pair

### Requirement: Parsing story and criteria text
When loading a file, the tool SHALL split the `User Story` cell into As a / I want / So that using the literal keywords `As a`, `I want` and `so that` (case-insensitive, first occurrence of each, in that order), and SHALL split the `User Acceptance Criteria` cell into criteria by line, each into Given / When / Then using the keywords `Given`, `when` and `then` (case-insensitive, first occurrence of each, in that order). The comma immediately before a keyword SHALL be treated as a separator and removed from the preceding field, and a missing comma SHALL be tolerated. The leading `AC<n>:` label SHALL be ignored and criteria renumbered from their position.

#### Scenario: Comma-separated syntax
- **WHEN** a cell reads `As a team lead, I want to export, so that I can share`
- **THEN** the fields load as `team lead`, `to export` and `I can share`, with no trailing commas

#### Scenario: Missing commas tolerated
- **WHEN** a cell reads `As a team lead I want to export so that I can share`
- **THEN** it loads the same fields, and the next save rewrites it with commas

#### Scenario: Cell edited in Excel
- **WHEN** the `User Acceptance Criteria` cell is edited in Excel and still follows the syntax
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

### Requirement: Epic and Feature suggestions
The Epic and Feature fields SHALL suggest values already used by stories in the currently open backlog, while still accepting any typed value. Epic SHALL suggest every distinct Epic. Feature SHALL suggest the distinct Features of stories with the same Epic as the selected story. Title SHALL NOT offer suggestions. Blank values SHALL NOT be suggested.

#### Scenario: Epic suggestions
- **WHEN** the backlog has stories in epics "Billing" and "Onboarding" and the user focuses Epic on another story
- **THEN** "Billing" and "Onboarding" are offered

#### Scenario: Capability narrowed by epic
- **WHEN** the selected story has Epic "Billing" and "Billing" stories use features "Invoices" and "Payments" while "Onboarding" uses "Signup"
- **THEN** Feature offers "Invoices" and "Payments" but not "Signup"

#### Scenario: New value
- **WHEN** the user types an Epic that no story uses
- **THEN** it is accepted and becomes a suggestion for other stories

#### Scenario: No title suggestions
- **WHEN** the user focuses Title on a story
- **THEN** no suggestions are offered

### Requirement: Story completeness indicators
The tool SHALL classify each story. A story is **incomplete** (red) when any of Epic, Feature, Title, As a, I want or So that is blank, or when it has no acceptance criterion, or when any of its criteria has a blank Given, When or Then. A story whose User Story or User Acceptance Criteria cell could not be parsed and is kept as raw text counts that cell as present. A story gets a **warning** (yellow) when Sprint points is missing, Priority is missing, or Sprint points is above 13. The indicator SHALL show on the story's row in the story list and on its form, SHALL list the reasons, and SHALL be advisory only and SHALL NOT block saving. When a story is both incomplete and has warnings, the row SHALL use the red style; the form SHALL show the red message first and the yellow message after it.

#### Scenario: Missing capability
- **WHEN** a story has a blank Feature
- **THEN** its list row is red and its form shows a red message naming Feature

#### Scenario: Missing title
- **WHEN** a story has a blank Title
- **THEN** its list row is red and its form shows a red message naming Title

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
The story list SHALL group stories under a subheader per Epic, with each group's stories listed beneath its subheader. Groups SHALL appear in the order their epic first occurs in the backlog, and stories within a group SHALL keep their backlog order. Stories with a blank Epic SHALL be grouped under a subheader reading "(No epic)". The list SHALL use a smaller font than the rest of the page so more rows fit. The list SHALL NOT scroll sideways: a story title too long for the panel SHALL be cut off with an ellipsis, and the full text SHALL remain available in the row's tooltip. Each story SHALL show its ID in its row. Grouping itself SHALL be display only: apart from the reordering described in "Reorder stories by drag and drop", it SHALL NOT change the order of rows in the saved file.

#### Scenario: Stories under their epic
- **WHEN** the backlog has stories in epics "Billing" and "Onboarding", interleaved in the file
- **THEN** the list shows a "Billing" subheader followed by its stories, then an "Onboarding" subheader followed by its stories

#### Scenario: No epic
- **WHEN** a story has a blank Epic
- **THEN** it is listed under a "(No epic)" subheader

#### Scenario: Epic edited
- **WHEN** the user changes the selected story's Epic from "Billing" to "Onboarding" and leaves the field
- **THEN** the story appears at the bottom of the "Onboarding" group and remains selected

#### Scenario: Long title
- **WHEN** a story's label is wider than the list panel
- **THEN** the title is cut with an ellipsis, the list has no horizontal scrollbar, and hovering the row still shows the full tooltip

#### Scenario: ID in the row
- **WHEN** a story has the ID `IAM-0002`
- **THEN** its row shows `IAM-0002`

#### Scenario: File order unchanged
- **WHEN** the list is grouped differently from the file order, no story is reordered or moved, and the backlog is saved
- **THEN** the CSV rows are written in their original order

### Requirement: Stories tab
The tool SHALL provide two tabs for an open backlog: **Editor**, showing the story list and story form, and **Stories**, showing every story of the backlog in one table. The table SHALL have a row per story with the columns ID, Epic, Feature, Title, Sprint points, Priority and Depends On (the IDs, separated by commas), and SHALL show the same completeness indicator (red or yellow, with the reasons in a tooltip) as the story list. Rows SHALL be ordered the same as the grouped story list. The Stories tab SHALL NOT allow editing a single story's fields or reordering. Clicking a story's title in the table SHALL select that story and switch to the Editor tab. Switching tabs SHALL NOT change or reload the backlog.

The Stories tab SHALL have a search box above the table. While the box holds text, the table SHALL show only the stories that match: a story matches when every space-separated word of the query appears, ignoring case, in at least one of its fields. The fields searched SHALL be every column of the story (including columns the tool does not know) and the text of its User Story, acceptance criteria and clarifications, whether or not that text was understood. Leading, trailing and repeated spaces in the query SHALL be ignored, and an empty query SHALL show every story. While a query is active the tab SHALL show how many of the backlog's stories match ("N of M stories"), and when none match it SHALL say so instead of "No stories yet". The query SHALL NOT be saved, SHALL NOT change the backlog, and SHALL NOT filter the Editor tab's story list. The row order of the matching stories SHALL be the same as without a query.

#### Scenario: Show all stories
- **WHEN** the user opens the Stories tab on a backlog with 12 stories
- **THEN** the table shows 12 rows with their ID, epic, feature, title, points, priority and dependencies

#### Scenario: Open a story from the table
- **WHEN** the user clicks the title of a story in the table
- **THEN** the Editor tab is shown with that story selected

#### Scenario: Indicators in the table
- **WHEN** a story is missing its Feature
- **THEN** its table row is red and its tooltip names Feature

#### Scenario: Edits show in the table
- **WHEN** the user changes a story's Priority in the Editor tab and switches to the Stories tab
- **THEN** the table shows the new priority

#### Scenario: Dependencies in the table
- **WHEN** story `IAM-0003` depends on `IAM-0001` and `DD-0002`
- **THEN** its row shows `IAM-0001, DD-0002` in the Depends On column

#### Scenario: Reorder shows in the table
- **WHEN** the user reorders stories in the Editor tab and switches to the Stories tab
- **THEN** the table shows the new order and IDs

#### Scenario: Search a field the table does not show
- **WHEN** one story's acceptance criteria contain "invoice" and the user types "INVOICE" in the search box
- **THEN** the table shows only that story and the count reads "1 of 12 stories"

#### Scenario: Search an unknown column
- **WHEN** the backlog has a column the tool does not know and one story holds "legacy" in it, and the user searches "legacy"
- **THEN** that story is shown

#### Scenario: All words must match
- **WHEN** the user searches "export csv" and a story mentions "export" in its title and "csv" in its notes, while another mentions only "export"
- **THEN** only the first story is shown

#### Scenario: Nothing matches
- **WHEN** the query matches no story
- **THEN** the table is empty and the tab says no story matches the query

#### Scenario: Clear the search
- **WHEN** the user empties the search box
- **THEN** every story is shown again, in the same order as before

#### Scenario: Editor list is not filtered
- **WHEN** the user has a query in the Stories tab and switches to the Editor tab
- **THEN** the story list shows every story

### Requirement: Multi-select in the Stories tab
Each table row SHALL have a checkbox, and the header SHALL have a select-all checkbox that selects or clears every row shown. Shift-clicking a row's checkbox SHALL select every row shown between it and the last clicked checkbox. The tool SHALL show how many stories are selected. While a search hides some of the selected stories, the tool SHALL also show how many selected stories are hidden. Select-all, shift-click and clearing SHALL act only on the rows shown: they SHALL NOT select or deselect a story the search hides. A bulk edit and Lock/Unlock selected SHALL apply to all selected stories, hidden ones included. The selection SHALL be separate from the story selected in the Editor tab, and SHALL be cleared when another backlog is opened. Stories removed from the backlog SHALL drop out of the selection.

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

#### Scenario: Select all with a search
- **WHEN** a search shows 4 of 12 stories and the user ticks the header checkbox
- **THEN** those 4 stories are selected and the other 8 are not

#### Scenario: Clear with a search keeps hidden ticks
- **WHEN** 2 stories were ticked, a search then shows 4 other stories, and the user ticks and unticks the header checkbox
- **THEN** the 4 shown stories are not selected, and the 2 hidden ones still are

#### Scenario: Range select with a search
- **WHEN** a search shows stories that are not neighbours in the backlog and the user shift-clicks from the first shown row to the last
- **THEN** only the shown rows between them are selected

#### Scenario: Hidden selection is reported
- **WHEN** 3 stories are selected and a search hides 2 of them
- **THEN** the status shows "3 selected" and that 2 of them are hidden by the search

#### Scenario: Bulk edit reaches hidden selected stories
- **WHEN** 3 stories are selected, a search hides 2 of them, and the user applies a Priority to the selection
- **THEN** the confirmation names 3 stories and all 3 get the Priority

### Requirement: Bulk edit selected stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Feature text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. An Epic change SHALL skip locked stories, and the confirmation SHALL say how many were skipped. On confirmation the tool SHALL set only the chosen fields on every selected story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs follow position", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. Priority and Feature changes SHALL apply to locked stories as well. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Feature are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Feature are unchanged

#### Scenario: Change epic
- **WHEN** 4 unlocked stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Feature and Title are unchanged, and the list shows them under "Billing"

#### Scenario: Change epic renumbers
- **WHEN** 2 stories `IAM-0001` and `IAM-0002` are moved to epic "Billing & Invoicing", which already has 3 stories, and a third story depends on `IAM-0001`
- **THEN** the two stories become `BI-0004` and `BI-0005` in their previous order, the remaining IAM stories are renumbered from `IAM-0001`, and the third story's dependency names `BI-0004`

#### Scenario: Confirmation mentions new IDs
- **WHEN** the user clicks Apply with an Epic that differs from the selected stories' current Epics
- **THEN** the confirmation states that the affected stories will receive new IDs

#### Scenario: Change capability
- **WHEN** stories from two different epics are selected and Feature is set to "Invoices"
- **THEN** after confirming, all selected stories have Feature "Invoices" and their IDs are unchanged

#### Scenario: Clear priority
- **WHEN** Priority is set to "None" and applied with confirmation
- **THEN** the selected stories have an empty Priority

#### Scenario: Several fields at once
- **WHEN** Priority High and Epic "Billing" are both set and confirmed
- **THEN** both are applied to every selected unlocked story, and Priority only to selected locked stories

#### Scenario: Nothing to apply
- **WHEN** stories are selected but Priority is "No change" and Epic and Feature are empty
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

#### Scenario: Locked stories skipped for Epic
- **WHEN** 5 stories are selected, 2 are locked, and Epic is set to "Billing" and confirmed
- **THEN** the 3 unlocked stories move to "Billing", the locked ones keep their Epic and ID, and the confirmation said 2 were skipped

### Requirement: Dependency graph tab
The tool SHALL provide a Graph tab, shown when a backlog is open, that draws each story as a node and each dependency as an arrow from the story to the story it depends on. Dependencies SHALL be editable in the graph as well as in the Editor.

#### Scenario: Show the graph
- **WHEN** the user opens the Graph tab of a backlog where story B depends on story A
- **THEN** nodes for A and B are shown with an arrow between them

#### Scenario: Dependencies read left to right
- **WHEN** a story depends on other stories
- **THEN** it is drawn to the right of all of them, so every arrow points the same way

#### Scenario: Node content
- **WHEN** a node is shown
- **THEN** it shows the story's ID and Title, and is coloured by its epic

#### Scenario: Indicators on nodes
- **WHEN** a story is incomplete or has a dependency warning
- **THEN** its node carries the same red or amber indicator as its row in the Stories tab

#### Scenario: Edits show in the graph
- **WHEN** the user adds or removes a dependency in the Editor and returns to the Graph tab
- **THEN** the graph shows the change

#### Scenario: No links
- **WHEN** the backlog has no dependencies
- **THEN** the graph shows a message saying so, and the stories are listed below it

### Requirement: Zoom and pan the graph
The user SHALL be able to zoom and pan the graph. The view SHALL reset to fit when a different backlog is opened.

#### Scenario: Zoom with the wheel
- **WHEN** the user scrolls the wheel with Ctrl held over the graph
- **THEN** the graph zooms in or out around the pointer

#### Scenario: Zoom buttons
- **WHEN** the user uses the zoom in, zoom out or Fit buttons
- **THEN** the graph zooms by a step, or scales to fit the whole graph in the panel

#### Scenario: Zoom limits
- **WHEN** the user keeps zooming in or out
- **THEN** zoom stops at a minimum and maximum

#### Scenario: Pan by dragging
- **WHEN** the user drags the empty background
- **THEN** the view moves with the pointer, and nodes and arrows are not changed

#### Scenario: Pan by scrolling
- **WHEN** the user scrolls the wheel without Ctrl
- **THEN** the view moves vertically (horizontally with Shift)

#### Scenario: Keyboard
- **WHEN** the graph has focus and the user presses +, − or 0, or the arrow keys
- **THEN** it zooms in, zooms out, fits to view, or pans respectively

#### Scenario: Linking while zoomed
- **WHEN** the graph is zoomed or panned and the user drags a link
- **THEN** the link lands on the node under the pointer

#### Scenario: Selection kept
- **WHEN** the user zooms or pans
- **THEN** the selected node, its highlight and any link in progress are unchanged

### Requirement: Open a story from the graph
Selecting a node SHALL highlight that story's dependencies and dependents, and the user SHALL be able to open the story in the Editor.

#### Scenario: Highlight related stories
- **WHEN** the user selects a node
- **THEN** that story, everything it depends on directly or indirectly, and everything that depends on it directly or indirectly stay prominent, and all other nodes and arrows are dimmed

#### Scenario: Clear the highlight
- **WHEN** the user selects the same node again or the empty background
- **THEN** all nodes and arrows return to normal

#### Scenario: Open in the Editor
- **WHEN** the user activates the Open action for the selected node or double-clicks a node
- **THEN** the Editor tab opens on that story

#### Scenario: Keyboard access
- **WHEN** the user tabs to a node and presses Enter or Space
- **THEN** the node is selected as if clicked

### Requirement: Edit dependencies in the graph
The user SHALL be able to add and remove dependencies in the Graph tab. Changes SHALL be saved like any other edit and reflected in the Editor and Stories tab.

#### Scenario: Add by dragging
- **WHEN** the user drags from story B's link handle onto story A
- **THEN** B depends on A, an arrow is drawn from B to A, and the layout updates

#### Scenario: Add by keyboard
- **WHEN** a node is selected and the user chooses Link, then selects another node
- **THEN** the selected story depends on the chosen one

#### Scenario: Link an unlinked story
- **WHEN** the user links a story from the "No dependencies" list to a node in the graph
- **THEN** it moves into the graph with the new arrow

#### Scenario: Remove a dependency
- **WHEN** the user selects an arrow and presses Delete or uses the Remove action
- **THEN** that dependency is removed from the story

#### Scenario: Cycle rejected
- **WHEN** a link would make a story depend on itself, directly or through others
- **THEN** no dependency is added and a message says it would create a cycle

#### Scenario: Duplicate ignored
- **WHEN** the user links a story to one it already depends on
- **THEN** nothing changes

#### Scenario: Story without an ID
- **WHEN** a story has no ID
- **THEN** it cannot be linked in the graph, and it is shown as unavailable for linking

### Requirement: Stories without links in the graph
Stories that neither depend on another story nor are depended on SHALL be listed apart from the graph, not drawn as nodes in it.

#### Scenario: Unlinked stories listed
- **WHEN** a backlog has linked and unlinked stories
- **THEN** the graph holds only the linked stories, and the unlinked ones are listed under "No dependencies" with their ID and Title

#### Scenario: Open an unlinked story
- **WHEN** the user activates an entry of that list
- **THEN** the Editor tab opens on that story

### Requirement: Graph tolerates bad dependency data
The graph SHALL NOT fail on dependency data that the tool flags as a problem.

#### Scenario: Dangling reference
- **WHEN** a story lists a Depends On ID that no story has
- **THEN** the graph is drawn from the links that resolve, and a note lists the unresolved references

#### Scenario: Cycle in the file
- **WHEN** a file contains a dependency cycle
- **THEN** the graph is still drawn, the stories in the cycle carry the warning indicator, and a note says the backlog has a cycle

#### Scenario: Story without an ID
- **WHEN** a story has no ID
- **THEN** it takes no part in the graph and is listed with the unlinked stories

### Requirement: Graph groups linked stories into clusters
The Graph tab SHALL group linked stories into clusters: a cluster holds every story connected to one another by dependencies, directly or through other stories. Each cluster SHALL be drawn in its own band, labelled with its number and story count, and the bands SHALL be stacked vertically with a visible gap between them, the cluster with the most stories first. A story or arrow SHALL NOT be drawn in a band of another cluster.

#### Scenario: Unrelated chains are separate
- **WHEN** a backlog has a chain A, B, C of dependent stories and a separate chain P, Q that shares no story with it
- **THEN** the graph shows two bands, "Cluster 1 · 3 stories" holding A, B and C and "Cluster 2 · 2 stories" holding P and Q, and no node of one band shares a row of the other

#### Scenario: Dependent stories stay together
- **WHEN** a story depends on stories that themselves depend on others
- **THEN** all of them are in the same band

#### Scenario: Largest cluster first
- **WHEN** a backlog has clusters of 2, 5 and 3 stories
- **THEN** the bands are shown in the order 5, 3, 2, and ties keep the order of their first story in the backlog

#### Scenario: A link joins two clusters
- **WHEN** the user links a story of one cluster to a story of another
- **THEN** the two clusters are shown as one band

#### Scenario: Removing a link splits a cluster
- **WHEN** the user removes the only dependency joining two groups of stories
- **THEN** the groups are shown as two bands

### Requirement: Graph arrows do not cross nodes
An arrow in the Graph tab SHALL NOT pass through a node other than the two it connects. An arrow between stories more than one column apart SHALL be routed through the space between nodes of the columns it crosses.

#### Scenario: Arrow skipping a column
- **WHEN** story C depends on story A and a story B sits in the column between them
- **THEN** the arrow from C to A passes above or below B, not through it

#### Scenario: Crossings are kept low
- **WHEN** the stories of a column depend on stories at different heights in an earlier column
- **THEN** they are ordered so that arrows do not cross where an order without crossings exists

#### Scenario: Arrows stay selectable
- **WHEN** the user clicks or focuses a routed arrow
- **THEN** it is selected and can be removed as before

#### Scenario: Cycle arrows
- **WHEN** the backlog has a dependency cycle
- **THEN** the graph is still drawn and the arrow that closes the cycle is marked as before, and it need not avoid nodes

### Requirement: Story IDs follow position
Every story with a non-blank Epic SHALL have an ID of the form `<PREFIX>-<NNNN>`, stored in the `ID` column, where `<NNNN>` is four digits. The prefix SHALL be the uppercased initials of the words of the story's Epic, ignoring `&` and other punctuation (`Identity & Access Management` gives `IAM`, `Data Delivery` gives `DD`). For an unlocked story the number SHALL be the lowest number, counting from 1, that no locked story of the same prefix holds, taken in the order of the backlog's rows among the unlocked stories with the same Epic. If the prefixes of two different Epics are equal, the Epic that occurs first in the backlog SHALL keep the prefix and each later one SHALL be lengthened by appending letters from the first word of its Epic (second letter, then third, and so on) until it is unique (`DD` in use, `Digital Dashboards` becomes `DDI`). A story with a blank Epic SHALL have no ID.

A **locked** story SHALL keep its ID: recomputing SHALL NOT change it, and its number SHALL NOT be given to another story. Numbers may therefore have gaps. The prefix of a locked story's ID SHALL stay reserved for its Epic so that no two stories ever share an ID, including when two Epics have equal initials.

The ID is not fixed for unlocked stories: the tool SHALL recompute their IDs whenever a story is added, deleted, reordered or moved to another Epic, when an Epic is committed, and when a backlog is loaded. New stories SHALL be placed after the other stories of their Epic. Whenever recomputing changes a story's ID, every `Depends On` entry in the backlog that referred to the old ID SHALL be rewritten to the new ID, so each link keeps pointing at the same story. The ID SHALL be shown on the story form as read-only text and SHALL NOT be editable.

An Epic SHALL count as committed when the Epic field loses focus or a suggestion is chosen; while the user is typing in it the story's ID SHALL NOT change.

#### Scenario: ID from epic and position
- **WHEN** the epic "Identity & Access Management" has three stories
- **THEN** their IDs are `IAM-0001`, `IAM-0002` and `IAM-0003` in row order

#### Scenario: New story goes to the bottom
- **WHEN** a fourth story is committed to that epic
- **THEN** it becomes `IAM-0004` and the other IDs are unchanged

#### Scenario: Not changed while typing
- **WHEN** the user is typing a new Epic into a story and has not left the field
- **THEN** the story's ID has not changed yet

#### Scenario: Prefix collision lengthens the later epic
- **WHEN** epic "Data Delivery" occurs before epic "Digital Dashboards"
- **THEN** the first epic's IDs start `DD-` and the second's start `DDI-`

#### Scenario: Blank epic has no ID
- **WHEN** a story has a blank Epic
- **THEN** its ID is blank and no other story can depend on it

#### Scenario: Delete closes the gap
- **WHEN** `IAM-0002` of three unlocked IAM stories is deleted
- **THEN** the former `IAM-0003` becomes `IAM-0002` and dependencies on it name `IAM-0002`

#### Scenario: Move to another epic
- **WHEN** story `IAM-0002` is moved to the epic "Data Delivery" and `DD-0001` is its last story, and another story depends on `IAM-0002`
- **THEN** the moved story becomes `DD-0002`, the former `IAM-0003` becomes `IAM-0002`, and each dependency names the same story as before

#### Scenario: Swapped IDs keep links
- **WHEN** `IAM-0001` and `IAM-0002` swap places and a third story depended on `IAM-0001`
- **THEN** the third story now depends on `IAM-0002`, which is the same story as before

#### Scenario: ID is read-only
- **WHEN** the user views a story that has an ID
- **THEN** the ID is displayed but cannot be edited

#### Scenario: Old file gets IDs
- **WHEN** a file without an `ID` column and with three stories in epic "Billing & Invoicing" is opened
- **THEN** the stories show `BI-0001` to `BI-0003` in file order, the file is saved with an `ID` column, and its other columns and their order are preserved

#### Scenario: Rows reordered in Excel
- **WHEN** a file's rows were reordered outside the tool so the `ID` values no longer match the positions
- **THEN** on load the IDs of unlocked stories follow the new positions and dependencies are rewritten to name the same stories

#### Scenario: Locked story keeps its ID when a story above is deleted
- **WHEN** `IAM-0002` is locked and the unlocked `IAM-0001` is deleted
- **THEN** the locked story is still `IAM-0002`

#### Scenario: Unlocked stories number around a locked one
- **WHEN** `IAM-0002` is locked and a new story is added to the epic after the unlocked `IAM-0001` and `IAM-0003`
- **THEN** the new story is `IAM-0004`, and if `IAM-0001` is then deleted the remaining unlocked stories become `IAM-0001` and `IAM-0003`

#### Scenario: Equal initials never share an ID
- **WHEN** a locked story holds `DD-0001` and its epic is "Data Delivery", and another epic "Digital Dashboards" exists
- **THEN** the second epic's stories are numbered `DDI-` and no story other than the locked one has `DD-0001`

#### Scenario: Links to a locked story survive
- **WHEN** an unlocked story depends on the locked `IAM-0002` and stories above it are deleted
- **THEN** the dependency still names `IAM-0002`

### Requirement: Reorder stories by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an unlocked story and drop it between two stories of an Epic group, above the first or below the last. A locked story SHALL NOT be draggable. Other stories MAY be dropped between or around locked stories; a locked story keeps its ID wherever the stories around it land. Dropping within the story's own group SHALL reorder it. Dropping into another Epic's group SHALL set the story's Epic to that group's Epic and place it at the dropped position. Dropping onto the "(No epic)" group SHALL have no effect. A drop SHALL show where the story will land while dragging, SHALL keep the story selected, and SHALL be saved through the normal auto-save. Reordering within a group SHALL change the saved order of that group's rows only and SHALL NOT move the rows of other Epics or change the order of the groups. IDs and dependencies SHALL be updated as described in "Story IDs follow position".

#### Scenario: Reorder within an epic
- **WHEN** the user drags the third story of "Billing" above the first and none is locked
- **THEN** it is listed first in the group, its ID becomes `...-0001`, the other two become `-0002` and `-0003`, and the CSV rows of the group are in the new order

#### Scenario: Move to another epic
- **WHEN** the user drags a story from "Billing" and drops it between the first and second stories of "Onboarding"
- **THEN** its Epic is "Onboarding", it is listed second in that group with the next free number of that group, and the unlocked stories after it are renumbered

#### Scenario: Drop at the end
- **WHEN** the user drops a story below the last story of a group
- **THEN** it becomes the last story of that group

#### Scenario: Other rows untouched
- **WHEN** a story is reordered within its group
- **THEN** the rows of other Epics keep their positions in the saved file and the groups keep their order

#### Scenario: Drop on no epic
- **WHEN** the user drops a story on the "(No epic)" group
- **THEN** nothing changes

#### Scenario: Selection kept
- **WHEN** the selected story is dragged to a new place
- **THEN** it is still the selected story and the form still shows it

#### Scenario: Dropped where it started
- **WHEN** a story is dropped at its own position
- **THEN** nothing changes and nothing is saved

#### Scenario: Locked story cannot be dragged
- **WHEN** the user tries to drag a locked story
- **THEN** it does not move

#### Scenario: Dropped next to a locked story
- **WHEN** an unlocked story is dropped above the locked `IAM-0002`
- **THEN** the locked story keeps `IAM-0002` and the dropped story takes the lowest free number

### Requirement: Story dependencies
Each story SHALL have an optional list of stories it depends on, stored in the `Depends On` column as story IDs separated by semicolons (for example `IAM-0001;IAM-0003`). On the story form the user SHALL be able to add and remove dependencies by picking from the other stories in the backlog that have an ID, listed by ID and label. A story SHALL NOT be offered as a dependency of itself, and the same story SHALL NOT be listed twice. The form SHALL also show, read-only, the stories that depend on the open story ("Required by"), derived from the other stories' `Depends On` and not stored. Each listed story SHALL be a link that opens that story in the Editor tab. A story without an ID SHALL show that an ID is assigned once an Epic is set, and cannot be linked until then.

#### Scenario: Add dependency
- **WHEN** the user picks `IAM-0001` in the Depends on picker of story `IAM-0003`
- **THEN** the `Depends On` cell of `IAM-0003` contains `IAM-0001` and the story form lists it

#### Scenario: Several dependencies
- **WHEN** the user adds `IAM-0001` and then `DD-0002`
- **THEN** the cell contains `IAM-0001;DD-0002`

#### Scenario: Remove dependency
- **WHEN** the user removes `IAM-0001` from the list
- **THEN** it no longer appears in the list or the cell

#### Scenario: Not offered twice or to itself
- **WHEN** the picker is opened on `IAM-0003` which already depends on `IAM-0001`
- **THEN** neither `IAM-0003` nor `IAM-0001` is offered

#### Scenario: Required by
- **WHEN** `IAM-0003` depends on `IAM-0001` and the user opens `IAM-0001`
- **THEN** "Required by" lists `IAM-0003`, and nothing is added to `IAM-0001`'s own cell

#### Scenario: Open a related story
- **WHEN** the user clicks a listed dependency
- **THEN** that story is selected in the Editor tab

#### Scenario: Story without an ID
- **WHEN** a story has no Epic yet
- **THEN** the form says an ID is assigned once an Epic is set

### Requirement: Dependency cycles are rejected
The tool SHALL NOT allow a dependency that would create a cycle, directly or through other stories. Such stories SHALL NOT be offered in the picker.

#### Scenario: Direct cycle
- **WHEN** `IAM-0003` depends on `IAM-0001`
- **THEN** `IAM-0003` is not offered as a dependency of `IAM-0001`

#### Scenario: Indirect cycle
- **WHEN** `C` depends on `B` and `B` depends on `A`
- **THEN** `C` is not offered as a dependency of `A`

### Requirement: Dependency data problems are flagged
When a loaded file has dependency data the tool cannot honour, it SHALL show a warning on the affected story's form, the story list and the Stories tab, and SHALL keep the data unchanged until the user changes it. The cases are: a `Depends On` entry that matches no story ID in the backlog (dangling), a story that depends on itself, a cycle already present in the file, and an entry that named an ID held by more than one story in the file (ambiguous). These warnings SHALL be advisory and SHALL NOT block saving.

#### Scenario: Dangling reference
- **WHEN** a loaded story lists `XYZ-0009` and no story has that ID
- **THEN** the story shows a warning naming `XYZ-0009`, and the value is written back unchanged

#### Scenario: Cycle in the file
- **WHEN** a loaded file has `A` depending on `B` and `B` depending on `A`
- **THEN** both stories show a cycle warning

#### Scenario: Ambiguous reference
- **WHEN** two loaded stories both have the ID `IAM-0001` and a third lists `IAM-0001`
- **THEN** the third shows a warning that `IAM-0001` is ambiguous, and the entry is not rewritten

#### Scenario: Warning clears
- **WHEN** the user removes the dangling entry
- **THEN** the warning disappears

### Requirement: Review suggestions are part of the editor
The story form, story list and Review tab SHALL display and apply review suggestions as described by the `backlog-review-suggestions` capability. Applying a suggestion SHALL be treated as an edit: it SHALL be autosaved like any other edit, SHALL keep story IDs derived from Epic and position, and SHALL keep `Depends On` links following their stories.

#### Scenario: Applied suggestion is saved
- **WHEN** the user applies a suggestion that changes a story's Epic
- **THEN** the story is renumbered, links to it are rewritten, and the backlog autosaves as it does for a manual Epic change

### Requirement: Move to Proposed button
The story form SHALL show a **Move to Proposed** button in the same row as the story ID. It SHALL appear only in the Editor tab's form, not in the Proposed tab's, and SHALL act on the open story only. Its behavior is defined by the story-proposals and backlog-review-suggestions capabilities.

#### Scenario: Button placement
- **WHEN** a story with an ID is open in the Editor tab
- **THEN** Move to Proposed is shown beside `ID: <code>`

#### Scenario: Not in the Proposed tab
- **WHEN** a story is open in the Proposed tab
- **THEN** the form has no Move to Proposed button

### Requirement: Lock a story
Each story SHALL have a lock, stored in the `Locked` column of the backlog CSV as `Yes` (locked) or empty (unlocked). A locked story is reference only: it is not submitted for review and its position is fixed. The story form SHALL offer a lock toggle. A story without an ID (blank Epic) SHALL NOT be lockable and the toggle SHALL be disabled for it with a hint that it needs an Epic. A locked story SHALL be marked as locked in the story list and the Stories tab.

A locked story SHALL NOT be draggable (see "Reorder stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability) and SHALL NOT be deleted: Alt+D and the delete button SHALL do nothing for it and the user SHALL be told to unlock it first. Only its **Epic** field SHALL be read-only; Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria and Notes SHALL stay editable, as SHALL the dependencies of other stories on it. Ctrl+Up/Down SHALL select a locked story like any other. Applying a review suggestion to a locked story is covered by the `backlog-review-suggestions` capability.

#### Scenario: Lock a story
- **WHEN** the user turns on the lock for `IAM-0002`
- **THEN** the story is marked locked, the Epic field becomes read-only, and the saved row has `Yes` in `Locked`

#### Scenario: Unlock
- **WHEN** the user turns the lock off
- **THEN** the Epic field is editable again and the saved row has an empty `Locked`

#### Scenario: No ID, no lock
- **WHEN** a story has a blank Epic
- **THEN** the lock toggle is disabled and says the story needs an Epic

#### Scenario: Other fields stay editable
- **WHEN** the user edits the Title, points and dependencies of a locked story
- **THEN** the changes are made and saved

#### Scenario: Cannot be deleted
- **WHEN** the user presses Alt+D or clicks delete on a locked story
- **THEN** the story is not deleted and a message says to unlock it first

### Requirement: Lock and unlock selected stories
When at least one story is selected in the Stories tab, the bulk edit bar area SHALL offer **Lock selected** and **Unlock selected**. Lock selected SHALL lock every selected story that has an ID and skip the others; when any were skipped the tool SHALL say how many ("n skipped (no ID)"). Unlock selected SHALL unlock every selected locked story. Both SHALL save through the normal auto-save, keep the selection, and SHALL NOT change any other field or any ID.

#### Scenario: Lock several
- **WHEN** five stories are selected, four have an ID, and the user clicks Lock selected
- **THEN** the four are locked and the message says 1 was skipped (no ID)

#### Scenario: Unlock several
- **WHEN** the user clicks Unlock selected with three locked stories selected
- **THEN** all three are unlocked and the selection is kept

### Requirement: Back up the open backlog
The editor SHALL show a Backup button in the file bar next to New and Open folder. The button SHALL be disabled while no backlog is open. Pressing it SHALL back up the open backlog, its review and its proposals as one backup (see the csv-file-store capability), after first waiting until every pending save of those three files has reached disk. If a save is failing, the editor SHALL NOT make a backup and SHALL say that the latest changes are not saved yet. On success the editor SHALL show a message naming the backlog and the time of the backup. On failure it SHALL show the reason and leave the backlog, review and proposals as they were.

#### Scenario: Backup with edits just typed
- **WHEN** the user edits a story and presses Backup before the auto-save has run
- **THEN** the pending edit is saved first, and the backup holds the edited backlog

#### Scenario: Backup after a review decision
- **WHEN** the user applies a review suggestion and presses Backup right away
- **THEN** the review's new status is saved first, and the backup holds it

#### Scenario: Successful backup
- **WHEN** the user presses Backup on `sprint-12.csv` and the backup succeeds
- **THEN** a message such as "Backed up sprint-12.csv at 14:32" is shown, and the new backup appears in the Backups tab

#### Scenario: Saving is failing
- **WHEN** the backlog cannot be saved (for example it is open in Excel) and the user presses Backup
- **THEN** no backup is made and the message says the latest changes could not be saved

#### Scenario: No backlog open
- **WHEN** there is no backlog in the data folder
- **THEN** the Backup button is disabled

#### Scenario: Backup is not repeated by accident
- **WHEN** the user presses Backup twice in a row
- **THEN** two separate backups exist and neither overwrote the other

### Requirement: Backups tab
The editor SHALL show a Backups tab for the open backlog, listing its backups newest first with their date and time. The tab SHALL let the user choose two states to compare, each either one of the backups or the current files, and SHALL show the resulting diff with added, removed and moved lines in distinct colors. The tab SHALL NOT offer to restore, delete or edit a backup. Before comparing with the current files, the editor SHALL wait until pending saves have reached disk, so "current" matches what is on screen.

#### Scenario: Backlog with backups
- **WHEN** the user opens the Backups tab of a backlog with two backups
- **THEN** both are listed, newest first, and two selectors offer them plus "Current"

#### Scenario: No backups yet
- **WHEN** the backlog has no backups
- **THEN** the tab says so and points to the Backup button

#### Scenario: Compare a backup with the current state
- **WHEN** the user edits a story, then compares the latest backup with "Current"
- **THEN** the edit is saved first and the diff shows that change

#### Scenario: Compare two backups
- **WHEN** the user selects two different backups and compares
- **THEN** the diff between them is shown, with removed, added and moved lines in distinct colors

#### Scenario: Nothing differs
- **WHEN** the two chosen states are identical
- **THEN** the tab says there are no differences

#### Scenario: Same state chosen twice
- **WHEN** both selectors name the same state
- **THEN** the compare action is disabled

#### Scenario: Comparison fails
- **WHEN** the comparison cannot run (for example git is missing)
- **THEN** the tab shows the reason, and the rest of the editor keeps working
