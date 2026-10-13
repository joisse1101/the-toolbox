## ADDED Requirements

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
- **THEN** it shows the story's ID and feature, and is coloured by its epic

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
- **THEN** the graph holds only the linked stories, and the unlinked ones are listed under "No dependencies" with their ID and feature

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
