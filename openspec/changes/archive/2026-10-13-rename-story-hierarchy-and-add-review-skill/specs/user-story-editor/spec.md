## RENAMED Requirements

- FROM: `### Requirement: Epic, Capability and Feature suggestions`
- TO: `### Requirement: Epic and Feature suggestions`

## MODIFIED Requirements

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
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, Acceptance Criteria, Notes`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On` or `Title` column SHALL be accepted and the columns added to it when it is saved. The tool SHALL NOT translate older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

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

#### Scenario: ID and dependencies saved
- **WHEN** story `IAM-0003` depends on `IAM-0001` and `DD-0002`
- **THEN** its row has `IAM-0003` in `ID` and `IAM-0001;DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On` and `Title` columns is opened and saved
- **THEN** the saved file has all three columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

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
The tool SHALL classify each story. A story is **incomplete** (red) when any of Epic, Feature, Title, As a, I want or So that is blank, or when it has no acceptance criterion, or when any of its criteria has a blank Given, When or Then. A story whose User Story or Acceptance Criteria cell could not be parsed and is kept as raw text counts that cell as present. A story gets a **warning** (yellow) when Sprint points is missing, Priority is missing, or Sprint points is above 13. The indicator SHALL show on the story's row in the story list and on its form, SHALL list the reasons, and SHALL be advisory only and SHALL NOT block saving. When a story is both incomplete and has warnings, the row SHALL use the red style; the form SHALL show the red message first and the yellow message after it.

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

### Requirement: Stories tab
The tool SHALL provide two tabs for an open backlog: **Editor**, showing the story list and story form, and **Stories**, showing every story of the backlog in one table. The table SHALL have a row per story with the columns ID, Epic, Feature, Title, Sprint points, Priority and Depends On (the IDs, separated by commas), and SHALL show the same completeness indicator (red or yellow, with the reasons in a tooltip) as the story list. Rows SHALL be ordered the same as the grouped story list. The Stories tab SHALL NOT allow editing a single story's fields or reordering. Clicking a story's title in the table SHALL select that story and switch to the Editor tab. Switching tabs SHALL NOT change or reload the backlog.

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

### Requirement: Bulk edit selected stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Feature text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. On confirmation the tool SHALL set only the chosen fields on every selected story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs follow position", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Feature are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Feature are unchanged

#### Scenario: Change epic
- **WHEN** 4 stories are selected, Epic is set to "Billing", and the user applies and confirms
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
- **THEN** both are applied to every selected story

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

### Requirement: Stories without links in the graph
Stories that neither depend on another story nor are depended on SHALL be listed apart from the graph, not drawn as nodes in it.

#### Scenario: Unlinked stories listed
- **WHEN** a backlog has linked and unlinked stories
- **THEN** the graph holds only the linked stories, and the unlinked ones are listed under "No dependencies" with their ID and Title

#### Scenario: Open an unlinked story
- **WHEN** the user activates an entry of that list
- **THEN** the Editor tab opens on that story
