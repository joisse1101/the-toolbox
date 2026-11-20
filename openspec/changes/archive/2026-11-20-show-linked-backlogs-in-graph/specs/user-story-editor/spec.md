# Spec Delta

## MODIFIED Requirements

### Requirement: Graph tolerates bad dependency data
The graph SHALL NOT fail on dependency data that the tool flags as a problem. A `Depends On` entry that names an existing story of another backlog of the data folder SHALL NOT count as unresolved (see the `cross-backlog-links` capability).

#### Scenario: Dangling reference
- **WHEN** a story lists a Depends On ID that no story has
- **THEN** the graph is drawn from the links that resolve, and a note lists the unresolved references

#### Scenario: Link to another backlog is not dangling
- **WHEN** a story lists `B3-BIL-0002`, an existing story of another backlog
- **THEN** no note lists `B3-BIL-0002` as unresolved

#### Scenario: Missing story with another backlog's initials
- **WHEN** a story lists `B3-BIL-0099` and the backlog with initials `B3` has no such story
- **THEN** the note lists `B3-BIL-0099` as unresolved

#### Scenario: Cycle in the file
- **WHEN** a file contains a dependency cycle
- **THEN** the graph is still drawn, the stories in the cycle carry the warning indicator, and a note says the backlog has a cycle

#### Scenario: Story without an ID
- **WHEN** a story has no ID
- **THEN** it takes no part in the graph and is listed with the unlinked stories

### Requirement: Graph detail levels
The Graph tab SHALL offer four levels, switched by a control next to the zoom controls: Stories (the graph as described by the other graph requirements), Features, Epics and Backlogs. At Features level each node SHALL be one feature of one epic, at Epics level one epic, and at Backlogs level one backlog of the data folder (see the `cross-backlog-links` capability). A node SHALL show its name and the number of stories it holds. A story with no ID, or with no Epic (or, at Features level, no Feature), SHALL take no part in the Features and Epics levels. Opening a backlog SHALL show the Stories level. The Features, Epics and Backlogs levels SHALL be read-only.

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

#### Scenario: Switch to Backlogs
- **WHEN** the user chooses Backlogs
- **THEN** each node is a backlog of the data folder, and an arrow joins two backlogs when any story of one depends on any story of the other

#### Scenario: Group with no link to another group
- **WHEN** all dependencies of a feature are between its own stories, or it has none
- **THEN** it is not drawn as a node and is listed under "No dependencies" with its story count

#### Scenario: Zoom, pan and clusters at every level
- **WHEN** the user zooms, pans, fits or selects a node at Features, Epics or Backlogs level
- **THEN** it behaves as at the Stories level, and connected groups are drawn together in one band labelled with its number and group count

#### Scenario: Level kept while the backlog changes
- **WHEN** the user returns to the Graph tab after editing a dependency in the Editor
- **THEN** the graph is shown at the level the user last chose and reflects the change

#### Scenario: Reset on another backlog
- **WHEN** the user opens a different backlog
- **THEN** the Graph tab shows the Stories level, fitted to view
