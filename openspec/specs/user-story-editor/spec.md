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
Each story SHALL support any number of acceptance criteria, each made of "Given", "When" and "Then I am" text fields. The user SHALL be able to add and remove criteria.

#### Scenario: Add criterion
- **WHEN** the user clicks "Add criterion"
- **THEN** a new empty Given/When/Then group appears

#### Scenario: Remove criterion
- **WHEN** the user removes the second of three criteria
- **THEN** the remaining two are renumbered 1 and 2

### Requirement: Multiple stories per backlog
A backlog file SHALL hold many stories, one per CSV row. The tool SHALL let the user add a story, switch between stories, and delete the selected story.

#### Scenario: Add story
- **WHEN** the user adds a story
- **THEN** a blank story is appended to the backlog and selected

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `Epic, Capability, Feature, User Story, Sprint points, Priority, Acceptance Criteria, Notes`.

- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when I <when>, then I am <then>`, where `<n>` is the criterion's position starting at 1.

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
When loading a file, the tool SHALL split the `User Story` cell into As a / I want / So that using the literal keywords `As a`, `I want` and `so that` (case-insensitive, first occurrence of each, in that order), and SHALL split the `Acceptance Criteria` cell into criteria by line, each into Given / When / Then I am using the keywords `Given`, `when I` and `then I am` (case-insensitive, first occurrence of each, in that order). The comma immediately before a keyword SHALL be treated as a separator and removed from the preceding field, and a missing comma SHALL be tolerated. The leading `AC<n>:` label SHALL be ignored and criteria renumbered from their position.

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
- **THEN** the preview shows two lines, `AC1: Given …, when I …, then I am …` and `AC2: …`

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
