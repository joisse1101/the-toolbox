## MODIFIED Requirements

### Requirement: Story fields
For each story the tool SHALL provide: Epic, Feature and Title as short text fields, where Title is the title of the user story; an "As" text field (the role, written with its article, for example "a team lead"), and "I want" and "So that" text fields; and Sprint points as a row of one-click buttons (see "Sprint points selector"). The tool SHALL also provide an optional multi-line free-text Notes field, stored as-is and not parsed. The tool SHALL NOT provide a Priority field.

#### Scenario: Notes field
- **WHEN** the user types several lines into Notes
- **THEN** the field accepts the line breaks and the text is saved unchanged in the `Notes` cell, and an empty Notes field saves as an empty cell

#### Scenario: Priority is optional
- **WHEN** a new story is created
- **THEN** the form shows no Priority control and the story can be saved without one

#### Scenario: Priority value not in the list
- **WHEN** a loaded file has a Priority column holding a value such as `Urgent`
- **THEN** the value is shown nowhere and is not written back when the file is saved

#### Scenario: Hierarchy fields
- **WHEN** the user opens a story
- **THEN** the form shows Epic, Feature and Title, and no Capability field

### Requirement: Story completeness indicators
The tool SHALL classify each story. A story is **incomplete** (red) when any of Epic, Feature, Title, As a, I want or So that is blank, or when it has no acceptance criterion, or when any of its criteria has a blank Given, When or Then. A story whose User Story or User Acceptance Criteria cell could not be parsed and is kept as raw text counts that cell as present. A story gets a **warning** (yellow) when Sprint points is missing or Sprint points is above 13. The indicator SHALL show on the story's row in the story list and on its form, SHALL list the reasons, and SHALL be advisory only and SHALL NOT block saving. When a story is both incomplete and has warnings, the row SHALL use the red style; the form SHALL show the red message first and the yellow message after it.

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
- **WHEN** a story has every required field but no Sprint points
- **THEN** its row is yellow and the form lists Sprint points as missing

#### Scenario: Red wins
- **WHEN** a story has a blank Epic and also 21 Sprint points
- **THEN** its row is red, and the form shows the red message followed by the "consider splitting" message

#### Scenario: Complete story
- **WHEN** all required fields and Sprint points are filled and points are 13 or less
- **THEN** the row and the form have no indicator

### Requirement: Stories tab
The tool SHALL provide two tabs for an open backlog: **Editor**, showing the story list and story form, and **Stories**, showing every story of the backlog in one table. The table SHALL have a row per story with the columns ID, Epic, Feature, Title, Sprint points and Depends On (the IDs, separated by commas), and SHALL show the same completeness indicator (red or yellow, with the reasons in a tooltip) as the story list. Rows SHALL be ordered the same as the grouped story list. The Stories tab SHALL NOT allow editing a single story's fields or reordering. Clicking a story's title in the table SHALL select that story and switch to the Editor tab. Switching tabs SHALL NOT change or reload the backlog.

The Stories tab SHALL have a search box above the table. While the box holds text, the table SHALL show only the stories that match: a story matches when every space-separated word of the query appears, ignoring case, in at least one of its fields. The fields searched SHALL be every column of the story (including columns the tool does not know) and the text of its User Story, acceptance criteria and clarifications, whether or not that text was understood. Leading, trailing and repeated spaces in the query SHALL be ignored, and an empty query SHALL show every story. While a query is active the tab SHALL show how many of the backlog's stories match ("N of M stories"), and when none match it SHALL say so instead of "No stories yet". The query SHALL NOT be saved, SHALL NOT change the backlog, and SHALL NOT filter the Editor tab's story list. The row order of the matching stories SHALL be the same as without a query.

#### Scenario: Show all stories
- **WHEN** the user opens the Stories tab on a backlog with 12 stories
- **THEN** the table shows 12 rows with their ID, epic, feature, title, points and dependencies, and no Priority column

#### Scenario: Open a story from the table
- **WHEN** the user clicks the title of a story in the table
- **THEN** the Editor tab is shown with that story selected

#### Scenario: Indicators in the table
- **WHEN** a story is missing its Feature
- **THEN** its table row is red and its tooltip names Feature

#### Scenario: Edits show in the table
- **WHEN** the user changes a story's Sprint points in the Editor tab and switches to the Stories tab
- **THEN** the table shows the new points

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
Each table row SHALL have a checkbox, and the header SHALL have a select-all checkbox that selects or clears every row shown. Shift-clicking a row's checkbox SHALL select every row shown between it and the last clicked checkbox. The tool SHALL show how many stories are selected. While a search hides some of the selected stories, the tool SHALL also show how many selected stories are hidden. Select-all, shift-click and clearing SHALL act only on the rows shown: they SHALL NOT select or deselect a story the search hides. A bulk edit and Delete selected SHALL apply to all selected stories, hidden ones included. The selection SHALL be separate from the story selected in the Editor tab, and SHALL be cleared when another backlog is opened. Stories removed from the backlog SHALL drop out of the selection.

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
- **WHEN** 3 stories are selected, a search hides 2 of them, and the user applies an Epic to the selection
- **THEN** the confirmation names 3 stories and all 3 get the Epic

### Requirement: Resizable Stories table columns
In the Stories tab, each column header (the selection column excluded) SHALL have a drag handle on its right edge. Dragging a handle SHALL change the width of that column only, between a minimum and a maximum width. Dragging a handle SHALL NOT sort the table or select anything, and clicking a header's sort button SHALL still sort. Column text wider than its column SHALL be cut off with an ellipsis and the full text SHALL remain available in the cell's tooltip. Each column's width SHALL be stored in the browser and applied again when the page is reopened, with the same fallbacks for a missing, invalid or out-of-range value and an unavailable browser store as the list panel. The table SHALL fill the width of its container: when the columns are narrower than the container, an extra empty column at the right SHALL take the difference, and when they are wider the columns SHALL be narrowed to fit, each giving up a share of its width above the minimum, so that the table does not scroll sideways. The stored widths SHALL NOT change when this happens and SHALL apply again when the container is wider. Only when even the minimum widths do not fit the container MAY the table scroll sideways. Dragging or fitting a column SHALL NOT widen it beyond the room the other columns leave. Double-clicking a handle SHALL set that column to the width of its widest text, header included, but no wider than the maximum column width, like double-clicking a column border in a spreadsheet. When the widened column does not fit beside the others, the other columns SHALL shrink to the minimum width one after the other, in the order Depends On, Title, Feature, Epic, Sprint points, ID, until it fits or none can shrink further; columns not needed for the room SHALL keep their widths. Columns the user has not resized SHALL keep their default width. Resizing SHALL NOT change the backlog, the sort, the search, the filters or the selection.

#### Scenario: Drag a column
- **WHEN** the user drags the Title column's handle 80px to the right
- **THEN** the Title column is 80px wider and the other columns keep their widths

#### Scenario: Dragging does not sort
- **WHEN** the user drags a column handle and releases it
- **THEN** the table's sort order is unchanged

#### Scenario: Long text
- **WHEN** an Epic name is wider than the Epic column
- **THEN** the cell shows the start of the name with an ellipsis and hovering shows the full name

#### Scenario: Widths kept after reload
- **WHEN** the user narrows the Feature column and reloads the page
- **THEN** the Feature column has the width the user set

#### Scenario: Fit a column to its text
- **WHEN** the user double-clicks the Epic column's handle and the longest Epic name needs 230px
- **THEN** the Epic column is about 230px wide plus its padding, no Epic name is cut off, and the width is kept after a reload

#### Scenario: Fit takes room from the others in order
- **WHEN** the columns fill the container and the user double-clicks the Epic column, whose text needs 100px more than it has
- **THEN** the Depends On column shrinks (to its minimum if it must) and then the Title column, as far as needed to give the 100px, and Feature, Sprint points and ID keep their widths

#### Scenario: Fit stops at the maximum
- **WHEN** the user double-clicks a column whose widest text needs more than the maximum column width
- **THEN** the column is set to the maximum width and longer text is still cut off with an ellipsis

#### Scenario: Window too narrow for the columns
- **WHEN** the user sets columns totalling 1400px and the container is 1000px wide
- **THEN** the columns are shown narrower so the table fits, with no horizontal scrollbar, and widening the window to 1400px shows the widths the user set

#### Scenario: Dragging into no room
- **WHEN** the columns fill the container and the user drags a column handle to the right
- **THEN** the column does not grow and the table does not scroll

#### Scenario: Wide window
- **WHEN** the columns together are narrower than the Stories tab's container
- **THEN** the table still spans the container and the columns the user did not widen keep their widths

### Requirement: Frozen stories are read-only
A story is **frozen** when its `Frozen` cell holds `Yes`. Only `jois-story-plan` freezes stories (see the `frozen-stories` capability); the portal SHALL offer no way to freeze or unfreeze a story: no toggle on the story form, no button on an Epic or Feature header, no bulk action in the Stories tab and no keyboard shortcut. A frozen story SHALL be marked as frozen on its row in the story list, on its row in the Stories tab and on its form.

The form of a frozen story SHALL show every field read-only: Epic, Feature, Title, As a, I want, So that, Sprint points, its own Depends On, the acceptance criteria, Notes and Clarifications. The form SHALL say that the story is frozen because it is part of a slice, and that a change to it is made by a new story that supersedes it. The Depends On entries of other stories that name a frozen story SHALL stay editable, and a frozen story SHALL be offered in the Depends on picker of other stories like any other story. Ctrl+Up/Down SHALL select a frozen story like any other.

A frozen story SHALL NOT be draggable (see "Reorder unfrozen stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability) and SHALL NOT be deleted: Alt+D SHALL do nothing for it and the user SHALL be told that a frozen story cannot be deleted, the Delete story button SHALL be disabled for it with the hint "A frozen story cannot be deleted", and Delete selected and Bulk edit SHALL skip it (see "Delete selected unfrozen stories" and "Bulk edit selected stories"). Applying a review suggestion to a frozen story is covered by the `backlog-review-suggestions` capability.

#### Scenario: Form of a frozen story
- **WHEN** the user opens a frozen story in the Editor tab
- **THEN** the form is marked frozen, every field is read-only, and a note says a change is made by a superseding story

#### Scenario: No freeze or unfreeze control
- **WHEN** the user looks at the story form, an Epic header, a Feature header and the bulk bar of the Stories tab
- **THEN** none of them offers to freeze, unfreeze or lock a story

#### Scenario: Marked in the lists
- **WHEN** a frozen story is listed in the Editor tab and in the Stories tab
- **THEN** both rows show it as frozen

#### Scenario: Dependency on a frozen story stays editable
- **WHEN** the user adds the frozen story `B1-IAM-0002` to the Depends on list of the unfrozen story `B1-IAM-0005`
- **THEN** the change is made and saved, and `B1-IAM-0002` is unchanged

#### Scenario: Cannot be dragged
- **WHEN** the user tries to drag a frozen story
- **THEN** it does not move

#### Scenario: Cannot be deleted
- **WHEN** the user presses Alt+D on a frozen story
- **THEN** the story is not deleted and a message says a frozen story cannot be deleted

#### Scenario: Delete story disabled
- **WHEN** a frozen story is open in the Editor tab
- **THEN** the Delete story button is disabled and its hint says a frozen story cannot be deleted

### Requirement: Bulk edit selected unfrozen stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with an Epic text field and a Feature text field. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the two is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. A bulk edit SHALL skip frozen stories whatever the field, because every field of a frozen story is read-only, and the confirmation SHALL say how many were skipped. On confirmation the tool SHALL set only the chosen fields on every selected unfrozen story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs carry initials, epic prefix and number", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If every selected story is frozen, nothing SHALL change and the tool SHALL say so. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected and the bulk edit bar is shown
- **THEN** the bar offers only an Epic field and a Feature field, and no Priority control

#### Scenario: Change epic
- **WHEN** 4 unfrozen stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Feature and Title are unchanged, and the list shows them under "Billing"

#### Scenario: Change epic renumbers
- **WHEN** 2 stories `B1-IAM-0001` and `B1-IAM-0002` are moved to epic "Billing & Invoicing", which already has 3 stories, and a third story depends on `B1-IAM-0001`
- **THEN** the two stories become `B1-BI-0004` and `B1-BI-0005` in their previous order, the remaining IAM stories are renumbered from `B1-IAM-0001`, and the third story's dependency names `B1-BI-0004`

#### Scenario: Confirmation mentions new IDs
- **WHEN** the user clicks Apply with an Epic that differs from the selected stories' current Epics
- **THEN** the confirmation states that the affected stories will receive new IDs

#### Scenario: Change capability
- **WHEN** stories from two different epics are selected and Feature is set to "Invoices"
- **THEN** after confirming, all selected stories have Feature "Invoices" and their IDs are unchanged

#### Scenario: Clear priority
- **WHEN** a file with a Priority column is opened, a bulk edit is applied and confirmed, and the file is saved
- **THEN** the saved file has no Priority column

#### Scenario: Several fields at once
- **WHEN** Epic "Billing" and Feature "Invoices" are both set and confirmed
- **THEN** both are applied to every selected unfrozen story

#### Scenario: Nothing to apply
- **WHEN** stories are selected but the Epic and Feature fields are empty
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

#### Scenario: Frozen stories skipped
- **WHEN** 5 stories are selected, 2 are frozen, and Epic is set to "Billing" and confirmed
- **THEN** the 3 unfrozen stories get Epic "Billing", the frozen ones are unchanged, and the confirmation said 2 were skipped

#### Scenario: Only frozen stories selected
- **WHEN** every selected story is frozen and the user clicks Apply
- **THEN** no story changes and the message says the selected stories are frozen

### Requirement: Story CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria, Notes, Frozen, Clarifications`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As <as>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `User Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Frozen` SHALL hold `Yes` for a frozen story and be empty otherwise. Any other value SHALL be read as unfrozen.
- `Clarifications` SHALL hold the story's question and answer pairs in the form defined by the `story-clarifications` capability, or be empty.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title`, `Frozen` or `Clarifications` column SHALL be accepted and the columns added to it when it is saved. An older `Locked` column and an older `Priority` column SHALL be ignored on load, never read as a value, and SHALL NOT be written when the file is saved. The tool SHALL NOT translate other older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As "a team lead", I want "to export a backlog", so that "I can share it"
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
- **WHEN** story `B1-IAM-0003` depends on `B1-IAM-0001` and `B1-DD-0002`
- **THEN** its row has `B1-IAM-0003` in `ID` and `B1-IAM-0001;B1-DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On`, `Title`, `Frozen` and `Clarifications` columns is opened and saved
- **THEN** the saved file has all five columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

#### Scenario: Old Locked column is dropped
- **WHEN** a file with a `Locked` column holding `Yes` on a story is opened and saved
- **THEN** the story is not frozen, the saved file has no `Locked` column, and every other column keeps its values

#### Scenario: Old Priority column is dropped
- **WHEN** a file with a `Priority` column holding `High` on a story is opened and saved
- **THEN** the saved file has no `Priority` column, the story's other columns keep their values, and no Priority is shown anywhere

#### Scenario: Frozen saved and reloaded
- **WHEN** a frozen story is saved and the file is reloaded
- **THEN** the story is still frozen

#### Scenario: Clarifications saved
- **WHEN** a story with a question and its answer is saved and the file is reloaded
- **THEN** the `Clarifications` cell holds `Q1: ...` and `A1: ...` lines and the story shows the same pair
