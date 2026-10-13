## ADDED Requirements

### Requirement: Keyboard shortcuts
The tool SHALL provide these keyboard shortcuts, active anywhere on the page including while a text field has focus: Alt+N adds a story, Alt+Shift+N creates a new backlog, Alt+D deletes the selected story, Ctrl+Up selects the previous story and Ctrl+Down selects the next story. Each shortcut SHALL do exactly what the matching button or click does today, including the delete confirmation. A shortcut that has nothing to act on (no story selected, no backlog loaded, already at the first or last story) SHALL do nothing. The tool SHALL prevent the browser's default action for a shortcut it handles.

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

## MODIFIED Requirements

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
