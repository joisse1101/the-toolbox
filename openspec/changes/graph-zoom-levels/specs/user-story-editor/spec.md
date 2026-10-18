## ADDED Requirements

### Requirement: Graph detail levels
The Graph tab SHALL offer three levels, switched by a control next to the zoom controls: Stories (the graph as described by the other graph requirements), Features and Epics. At Features level each node SHALL be one feature of one epic, and at Epics level one epic. A node SHALL show its name and the number of stories it holds. A story with no ID, or with no Epic (or, at Features level, no Feature), SHALL take no part in the coarse levels. Opening a backlog SHALL show the Stories level. The Features and Epics levels SHALL be read-only.

#### Scenario: Switch to Features
- **WHEN** the user chooses Features while stories of feature "Login" depend on stories of feature "Session"
- **THEN** the graph shows a node "Login" and a node "Session" with one arrow from Login to Session

#### Scenario: Same feature name in two epics
- **WHEN** two epics each have a feature named "Setup"
- **THEN** Features level shows two separate "Setup" nodes, each labelled with its epic

#### Scenario: Arrow weight
- **WHEN** three story dependencies run from stories of feature A to stories of feature B
- **THEN** one arrow joins A and B and is labelled 3

#### Scenario: Links inside a group
- **WHEN** a story of feature A depends on another story of feature A
- **THEN** no arrow is drawn for that link, and the node of A shows how many such internal links it holds

#### Scenario: Switch to Epics
- **WHEN** the user chooses Epics
- **THEN** each node is an epic, and an arrow joins two epics when any story of one depends on any story of the other

#### Scenario: Group with no link to another group
- **WHEN** all dependencies of a feature are between its own stories, or it has none
- **THEN** it is not drawn as a node and is listed under "No dependencies" with its story count

#### Scenario: Zoom, pan and clusters at every level
- **WHEN** the user zooms, pans, fits or selects a node at Features or Epics level
- **THEN** it behaves as at the Stories level, and connected groups are drawn together in one band labelled with its number and group count

#### Scenario: Level kept while the backlog changes
- **WHEN** the user returns to the Graph tab after editing a dependency in the Editor
- **THEN** the graph is shown at the level the user last chose and reflects the change

#### Scenario: Reset on another backlog
- **WHEN** the user opens a different backlog
- **THEN** the Graph tab shows the Stories level, fitted to view

### Requirement: Mutual dependency between groups
At Features and Epics levels, two groups that depend on each other through different stories SHALL be drawn with an arrow each way and a note naming them. This SHALL NOT be reported as a dependency cycle; the cycle note stays specific to the Stories level.

#### Scenario: Features depend on each other
- **WHEN** a story of feature A depends on a story of feature B and another story of B depends on another story of A, and no story cycle exists
- **THEN** Features level shows both arrows and a note "A and B depend on each other", and no dependency-cycle note or warning indicator

#### Scenario: Real cycle still reported
- **WHEN** the backlog has a dependency cycle between stories
- **THEN** the Stories level reports it as before

### Requirement: Inspect a group link without editing
At Features and Epics levels, selecting a node or an arrow SHALL list the story dependencies behind it, and no dependency SHALL be added or removed there.

#### Scenario: Select an arrow
- **WHEN** the user selects the arrow from feature A to feature B
- **THEN** the story links it stands for are listed, each as "<ID> <Title> depends on <ID> <Title>"

#### Scenario: Open from the list
- **WHEN** the user activates a story in that list
- **THEN** the Editor tab opens on that story

#### Scenario: Show at story level
- **WHEN** the user activates the "Show stories" action for the selection
- **THEN** the Stories level opens with the stories of the selected group or link highlighted

#### Scenario: Highlight related groups
- **WHEN** the user selects a group node
- **THEN** the groups it depends on and that depend on it, directly or indirectly, stay prominent and the rest are dimmed

#### Scenario: No link editing
- **WHEN** the level is Features or Epics
- **THEN** there are no link handles, and the Link and Remove dependency actions are disabled
