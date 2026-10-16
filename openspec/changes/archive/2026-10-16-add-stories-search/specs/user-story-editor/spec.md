## MODIFIED Requirements

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
