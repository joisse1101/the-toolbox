## ADDED Requirements

### Requirement: Story IDs follow position
Every story with a non-blank Epic SHALL have an ID of the form `<PREFIX>-<NNNN>`, stored in the `ID` column, where `<NNNN>` is four digits. The prefix SHALL be the uppercased initials of the words of the story's Epic, ignoring `&` and other punctuation (`Identity & Access Management` gives `IAM`, `Data Delivery` gives `DD`). The number SHALL be the story's position among the stories with the same Epic, counting from 1 in the order of the backlog's rows. If the prefixes of two different Epics are equal, the Epic that occurs first in the backlog SHALL keep the prefix and each later one SHALL be lengthened by appending letters from the first word of its Epic (second letter, then third, and so on) until it is unique (`DD` in use, `Digital Dashboards` becomes `DDI`). A story with a blank Epic SHALL have no ID.

The ID is not fixed: the tool SHALL recompute every ID whenever a story is added, deleted, reordered or moved to another Epic, when an Epic is committed, and when a backlog is loaded. New stories SHALL be placed after the other stories of their Epic. Whenever recomputing changes a story's ID, every `Depends On` entry in the backlog that referred to the old ID SHALL be rewritten to the new ID, so each link keeps pointing at the same story. The ID SHALL be shown on the story form as read-only text and SHALL NOT be editable.

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
- **WHEN** `IAM-0002` of three IAM stories is deleted
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
- **THEN** on load the IDs follow the new positions and dependencies are rewritten to name the same stories

### Requirement: Reorder stories by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag a story and drop it between two stories of an Epic group, above the first or below the last. Dropping within the story's own group SHALL reorder it. Dropping into another Epic's group SHALL set the story's Epic to that group's Epic and place it at the dropped position. Dropping onto the "(No epic)" group SHALL have no effect. A drop SHALL show where the story will land while dragging, SHALL keep the story selected, and SHALL be saved through the normal auto-save. Reordering within a group SHALL change the saved order of that group's rows only and SHALL NOT move the rows of other Epics or change the order of the groups. IDs and dependencies SHALL be updated as described in "Story IDs follow position".

#### Scenario: Reorder within an epic
- **WHEN** the user drags the third story of "Billing" above the first
- **THEN** it is listed first in the group, its ID becomes `...-0001`, the other two become `-0002` and `-0003`, and the CSV rows of the group are in the new order

#### Scenario: Move to another epic
- **WHEN** the user drags a story from "Billing" and drops it between the first and second stories of "Onboarding"
- **THEN** its Epic is "Onboarding", it is listed second in that group with the second ID of that group, and the stories after it move down by one

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

## MODIFIED Requirements

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Capability, Feature, User Story, Sprint points, Priority, Depends On, Acceptance Criteria, Notes`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID` or `Depends On` column SHALL be accepted and the columns added to it when it is saved.

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
- **WHEN** a file without `ID` and `Depends On` columns is opened and saved
- **THEN** the saved file has both columns and every other column keeps its values

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
The tool SHALL provide two tabs for an open backlog: **Editor**, showing the story list and story form, and **Stories**, showing every story of the backlog in one table. The table SHALL have a row per story with the columns ID, Epic, Capability, Feature, Sprint points, Priority and Depends On (the IDs, separated by commas), and SHALL show the same completeness indicator (red or yellow, with the reasons in a tooltip) as the story list. Rows SHALL be ordered the same as the grouped story list. The Stories tab SHALL NOT allow editing a single story's fields or reordering. Clicking a story's title in the table SHALL select that story and switch to the Editor tab. Switching tabs SHALL NOT change or reload the backlog.

#### Scenario: Show all stories
- **WHEN** the user opens the Stories tab on a backlog with 12 stories
- **THEN** the table shows 12 rows with their ID, epic, capability, feature, points, priority and dependencies

#### Scenario: Open a story from the table
- **WHEN** the user clicks the title of a story in the table
- **THEN** the Editor tab is shown with that story selected

#### Scenario: Indicators in the table
- **WHEN** a story is missing its Capability
- **THEN** its table row is red and its tooltip names Capability

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
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Capability text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Capability fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Capability in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. On confirmation the tool SHALL set only the chosen fields on every selected story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs follow position", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Capability are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Capability are unchanged

#### Scenario: Change epic
- **WHEN** 4 stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Capability and Feature are unchanged, and the list shows them under "Billing"

#### Scenario: Change epic renumbers
- **WHEN** 2 stories `IAM-0001` and `IAM-0002` are moved to epic "Billing & Invoicing", which already has 3 stories, and a third story depends on `IAM-0001`
- **THEN** the two stories become `BI-0004` and `BI-0005` in their previous order, the remaining IAM stories are renumbered from `IAM-0001`, and the third story's dependency names `BI-0004`

#### Scenario: Confirmation mentions new IDs
- **WHEN** the user clicks Apply with an Epic that differs from the selected stories' current Epics
- **THEN** the confirmation states that the affected stories will receive new IDs

#### Scenario: Change capability
- **WHEN** stories from two different epics are selected and Capability is set to "Invoices"
- **THEN** after confirming, all selected stories have Capability "Invoices" and their IDs are unchanged

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

### Requirement: Multiple stories per backlog
A backlog file SHALL hold many stories, one per CSV row. The tool SHALL let the user add a story, switch between stories, and delete the selected story. A new story SHALL be appended to the end of the backlog. Deleting a story SHALL remove its ID from the `Depends On` of every other story and renumber the rest of its Epic as described in "Story IDs follow position". In the story list each story SHALL be labelled `<capability>: <feature>`; if only one of them is filled it SHALL show that one alone, and if both are blank it SHALL show "New story". Hovering a story in the list SHALL show a tooltip with the composed user story, followed by any completeness or warning reasons.

#### Scenario: Add story
- **WHEN** the user adds a story
- **THEN** a blank story is appended to the backlog and selected

#### Scenario: Delete removes references
- **WHEN** story `IAM-0001` is deleted and `IAM-0003` depended on it
- **THEN** `IAM-0003` no longer lists `IAM-0001` in its dependencies

#### Scenario: List label
- **WHEN** a story has Capability "Invoices" and Feature "Export"
- **THEN** its list row reads "Invoices: Export"

#### Scenario: List label with one part
- **WHEN** a story has only a Feature "Export"
- **THEN** its list row reads "Export", without a colon

#### Scenario: Tooltip
- **WHEN** the user hovers a story that is missing its Epic
- **THEN** the tooltip shows the user story text and a line saying Epic is missing
