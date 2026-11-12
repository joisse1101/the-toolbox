# portal-safe-actions Specification

## Purpose
Keeps destructive actions in the planner portal safe and predictable, and gives every tab the same shape so the user always knows where the main action is.

## Requirements

### Requirement: One confirmation dialog
Every delete, clear and discard action SHALL ask for confirmation in one shared in-page dialog that names what will go and how many. The action that opened it SHALL look like any other button. Only the dialog's final button SHALL be bold and red, and Cancel SHALL be the default.

#### Scenario: Delete a term
- **WHEN** the user chooses Delete term
- **THEN** a dialog names the term, with Cancel focused and a red Delete button

#### Scenario: Unconfirmed deletes gone
- **WHEN** the user chooses Delete selected on the Proposed tab or Clear all on the Review tab
- **THEN** the shared dialog appears first and nothing is removed until it is confirmed

### Requirement: Bulk actions use visible rows only
A bulk action on the Stories table SHALL apply only to rows that match the current search and filters. When ticked rows are hidden, the count SHALL show how many are hidden and the confirmation SHALL name both numbers.

#### Scenario: Hidden ticked rows
- **WHEN** 2 rows are ticked and a search then hides both
- **THEN** Delete selected is disabled, or its confirmation says that 0 are visible and 2 are hidden, and no hidden row is deleted

### Requirement: Quiet bulk bar
The Stories bulk bar SHALL be hidden or visually quiet until at least one row is ticked, then show the count of ticked rows. It SHALL NOT repeat filters.

#### Scenario: Nothing ticked
- **WHEN** no row is ticked
- **THEN** the bulk bar has no accent border and no enabled action

### Requirement: One primary action per view
Each view SHALL have at most one primary-styled button; per-item actions repeated down a list SHALL be secondary.

#### Scenario: Suggestion list
- **WHEN** a story has three open suggestions
- **THEN** none of the three Apply buttons is primary-styled

### Requirement: Shared tab header and empty state
Every tab SHALL start with a title on the left and its actions on the right. A tab with nothing to show SHALL show one empty state with a title, one line of help and, where it applies, one action. The empty Stories search SHALL offer Clear filters. A tab SHALL NOT show more than one empty message.

#### Scenario: Empty Proposed tab
- **WHEN** there are no proposed stories
- **THEN** one empty state with an Add story action shows, and the accept and delete toolbar is hidden

### Requirement: Settings grouping and paths
Settings SHALL group its fields under headings (Project, Storage). A path SHALL be shown read-only, selectable and copyable, with the whole path available when it is cut short. The explanation of a risky action SHALL be a tooltip of that action's button, shown on hover and on keyboard focus and linked to the button with `aria-describedby`, and an overwrite SHALL be the red confirm step.

#### Scenario: Long path
- **WHEN** the data folder path is longer than its box
- **THEN** the user can select and copy the whole path
