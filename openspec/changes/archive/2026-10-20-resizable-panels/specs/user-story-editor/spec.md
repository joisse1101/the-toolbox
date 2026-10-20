## MODIFIED Requirements

### Requirement: Full-width generator layout
The user story generator page SHALL use the full width of the browser window, with only a small side margin, instead of a narrow centred column. The story list SHALL have a narrow width, 260px unless the user has resized it (see "Resizable list panel"), and the story form SHALL take the remaining width. The layout SHALL remain usable on narrow windows.

#### Scenario: Wide window
- **WHEN** the window is 1920px wide and the user has not resized the list
- **THEN** the story form spans the window except for the 260px story list and a small margin on each side

## ADDED Requirements

### Requirement: Resizable list panel
On the Editor, Proposed and Lexicon tabs, a draggable divider SHALL separate the list panel from the form beside it. Dragging the divider SHALL change the width of the list panel and the form SHALL take the remaining width. The width SHALL stay between a minimum and a maximum, so that neither the list nor the form can be dragged out of sight. Each of the three tabs SHALL have its own width: resizing one SHALL NOT change the others. The width SHALL be stored in the browser (not in the backlog, `data/` or on the server) and applied again when the page is reopened. Double-clicking the divider SHALL reset that tab's width to 260px. A stored value that is missing, not a number or outside the limits SHALL be replaced by the nearest allowed width, or the default when it is not a number, and an unavailable browser store SHALL NOT break the page (the width then lasts until the page is closed). When the layout stacks, at a window width of 800px or less, the divider SHALL NOT be shown and the stored width SHALL NOT apply. Resizing SHALL NOT change the backlog, the proposals or the lexicon.

#### Scenario: Drag the divider
- **WHEN** the user drags the Editor tab's divider 100px to the right
- **THEN** the story list is 100px wider than before and the story form is narrower by the same amount

#### Scenario: Limits
- **WHEN** the user drags the divider further than the maximum width, or narrower than the minimum
- **THEN** the list stops at the maximum or minimum width

#### Scenario: Width kept after reload
- **WHEN** the user widens the Proposed tab's list and reloads the page
- **THEN** the Proposed tab's list has the width the user set

#### Scenario: Tabs are independent
- **WHEN** the user widens the Editor tab's list
- **THEN** the Proposed and Lexicon tabs' lists keep their own widths

#### Scenario: Reset
- **WHEN** the user double-clicks the divider of a tab whose list was resized
- **THEN** the list returns to 260px and the stored width is cleared

#### Scenario: Bad stored value
- **WHEN** the stored width for a tab is `abc`
- **THEN** the tab uses the 260px default

#### Scenario: Stacked layout
- **WHEN** the window is 800px wide or narrower
- **THEN** no divider is shown and the list and form are stacked as before

### Requirement: Resizable Stories table columns
In the Stories tab, each column header (the selection column excluded) SHALL have a drag handle on its right edge. Dragging a handle SHALL change the width of that column only, between a minimum and a maximum width. Dragging a handle SHALL NOT sort the table or select anything, and clicking a header's sort button SHALL still sort. Column text wider than its column SHALL be cut off with an ellipsis and the full text SHALL remain available in the cell's tooltip. Each column's width SHALL be stored in the browser and applied again when the page is reopened, with the same fallbacks for a missing, invalid or out-of-range value and an unavailable browser store as the list panel. The table SHALL fill the width of its container: when the columns are narrower than the container, an extra empty column at the right SHALL take the difference, and when they are wider the columns SHALL be narrowed to fit, each giving up a share of its width above the minimum, so that the table does not scroll sideways. The stored widths SHALL NOT change when this happens and SHALL apply again when the container is wider. Only when even the minimum widths do not fit the container MAY the table scroll sideways. Dragging or fitting a column SHALL NOT widen it beyond the room the other columns leave. Double-clicking a handle SHALL set that column to the width of its widest text, header included, but no wider than the maximum column width, like double-clicking a column border in a spreadsheet. When the widened column does not fit beside the others, the other columns SHALL shrink to the minimum width one after the other, in the order Depends On, Title, Feature, Epic, Priority, Sprint points, ID, until it fits or none can shrink further; columns not needed for the room SHALL keep their widths. Columns the user has not resized SHALL keep their default width. Resizing SHALL NOT change the backlog, the sort, the search, the filters or the selection.

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
- **THEN** the Depends On column shrinks (to its minimum if it must) and then the Title column, as far as needed to give the 100px, and Feature, Priority, Sprint points and ID keep their widths

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
