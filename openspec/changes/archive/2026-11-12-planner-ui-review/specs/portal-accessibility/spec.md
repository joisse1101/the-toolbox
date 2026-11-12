# Spec Delta

## Purpose

Makes every part of the planner portal reachable by keyboard and readable by assistive technology, and makes sure no meaning is carried by colour alone.

## ADDED Requirements

### Requirement: Rows are buttons
Each story row in the Editor list and each term row in the Lexicon list SHALL contain a real button that opens it, reachable with Tab and activated with Enter or Space. The open row SHALL be marked as current.

#### Scenario: Open a story by keyboard
- **WHEN** the user tabs to a story row and presses Enter
- **THEN** the story opens in the form

### Requirement: Tab bar keyboard use
The tab bar SHALL be a single Tab stop. Left and Right arrows SHALL move between tabs, and Home and End SHALL jump to the first and last. Each tab SHALL point to a panel that exists.

#### Scenario: Arrow keys
- **WHEN** focus is on the Stories tab and the user presses Right
- **THEN** focus and selection move to the next tab

### Requirement: Dialog focus
When a dialog opens, focus SHALL move into it; Tab SHALL stay inside it; Escape SHALL close it; and on close focus SHALL return to the control that opened it. Its mode choice SHALL be a labelled group, and an error SHALL appear next to the field it concerns and be announced.

#### Scenario: Close returns focus
- **WHEN** the user opens Add project and presses Escape
- **THEN** the dialog closes and focus is back on the button that opened it

### Requirement: Graph focus ring
A focused graph node, edge or canvas SHALL show the same focus ring as other controls. Nodes SHALL come before edges in the Tab order.

#### Scenario: Focus an edge
- **WHEN** the user tabs onto an edge
- **THEN** the edge is drawn thicker and in the accent colour

### Requirement: Status is not colour alone
Every state shown by colour (incomplete, warning, missing required field, selected graph node, failed save) SHALL also be shown by text or an icon. A missing required field SHALL say so beside the field and be marked invalid for assistive technology.

#### Scenario: Missing field
- **WHEN** a story has no Title
- **THEN** the Title field shows the word "Required" beside it as well as the coloured border

### Requirement: Graph legend
The Graph tab SHALL show a legend that says what the node colours mean and how a selected node's dependencies and dependents are marked.

#### Scenario: Legend present
- **WHEN** the Graph tab shows stories
- **THEN** a legend lists each colour with its meaning

### Requirement: Non-drag reordering
Anything reordered by dragging (acceptance criteria, stories) SHALL also be movable with Move up and Move down buttons.

#### Scenario: Move a criterion
- **WHEN** the user activates Move up on the second criterion
- **THEN** it becomes the first

### Requirement: Missing optional files are empty
When a backlog folder exists but its proposals, lexicon, lexicon-suggestions or review file does not, the file API SHALL answer with an empty file and no error, and opening the backlog SHALL produce no failed request.

#### Scenario: Backlog with only stories
- **WHEN** the portal opens a backlog folder that holds only `user-stories.csv`
- **THEN** the Proposed and Lexicon tabs show their empty states and the browser console shows no 404
