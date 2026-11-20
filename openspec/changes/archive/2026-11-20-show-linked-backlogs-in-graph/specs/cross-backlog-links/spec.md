# Spec Delta

## ADDED Requirements

### Requirement: The graph shows stories of other backlogs as dashed nodes
At the Stories level, the Graph tab SHALL draw each story of another backlog of the data folder that a story of the open backlog depends on, or that depends on a story of the open backlog, as a dashed node. The node SHALL show the story's ID, Title and backlog name. An arrow SHALL join it to each open-backlog story it is linked with. Links between two stories of other backlogs SHALL NOT be drawn.

#### Scenario: Dependency in another backlog
- **WHEN** story `B1-IAM-0004` of `core` depends on `B3-BIL-0002` of `payments`, titled "Export invoices", and `core` is open
- **THEN** the graph shows a dashed node `B3-BIL-0002` "Export invoices" labelled `payments`, with an arrow from `B1-IAM-0004` to it

#### Scenario: Dependent in another backlog
- **WHEN** story `B2-REP-0002` of `reporting` depends on `B1-IAM-0004` of `core`, and `core` is open
- **THEN** the graph shows a dashed node `B2-REP-0002` labelled `reporting`, with an arrow from it to `B1-IAM-0004`

#### Scenario: Story with only a link to another backlog
- **WHEN** a story of the open backlog has no link inside it and depends only on a story of another backlog
- **THEN** it is drawn in the graph with that link, not listed under "No dependencies"

#### Scenario: Two linked stories, one migrated
- **WHEN** `B1-IAM-0005` depends on `B1-IAM-0002` in `core`, and `B1-IAM-0002` is migrated to `payments` as `B3-IAM-0007`
- **THEN** with `core` open, the story now `B1-IAM-0004` has an arrow to a dashed node `B3-IAM-0007` labelled `payments`, and with `payments` open, `B3-IAM-0007` has an arrow from a dashed node `B1-IAM-0004` labelled `core`

### Requirement: Dashed nodes are read-only
A dashed node SHALL be selectable, which highlights the stories it is linked with as for any node, and the hint SHALL name its backlog. It SHALL NOT be opened in the Editor, offer a link handle or Link, or be accepted as the end of a new link. An arrow from an open-backlog story to a dashed node SHALL be removable as any arrow, because the open backlog stores it. An arrow from a dashed node SHALL NOT be removable.

#### Scenario: Select a dashed node
- **WHEN** the user selects the dashed node `B3-BIL-0002` of `payments`
- **THEN** its linked open-backlog stories stay bright, the hint names `payments`, and Open in Editor and Link are disabled

#### Scenario: Remove an arrow to another backlog
- **WHEN** the user selects the arrow from `B1-IAM-0004` to the dashed node `B3-BIL-0002` and presses Remove dependency
- **THEN** `B1-IAM-0004` no longer depends on `B3-BIL-0002`, the change is saved, and the dashed node disappears if nothing else links to it

#### Scenario: Arrow from another backlog cannot be removed
- **WHEN** the user selects the arrow from the dashed node `B2-REP-0002` to `B1-IAM-0004`
- **THEN** Remove dependency is disabled and the hint says the link is stored in `reporting`

#### Scenario: Link dropped on a dashed node
- **WHEN** the user drags a link from an open-backlog story onto a dashed node
- **THEN** no link is added and a note says a link to another backlog is added in the Editor

### Requirement: Other backlogs at the Features and Epics levels
At the Features and Epics levels, each other backlog that the open backlog has a link with SHALL be drawn as one dashed node named after the backlog, showing how many of its stories are linked. Arrows SHALL join it to the open backlog's groups and carry the number of story links, as between groups.

#### Scenario: Epic depends on another backlog
- **WHEN** two stories of Epic "Billing" in `core` depend on stories of `payments`
- **THEN** at the Epics level an arrow labelled 2 runs from "Billing" to a dashed node `payments`

#### Scenario: Story links behind the arrow
- **WHEN** the user selects that arrow
- **THEN** the two story links are listed, the `core` stories as buttons that open them and the `payments` stories by ID, Title and backlog name

### Requirement: Backlogs level
The Graph tab SHALL offer a Backlogs level. Each backlog of the data folder that has a link with another backlog SHALL be one node, showing its name and initials, with the open backlog marked. An arrow SHALL run from a backlog to each backlog it depends on, labelled with the number of story links. Selecting a node or an arrow SHALL list the story links behind it. The level SHALL be read-only.

#### Scenario: Linked backlogs
- **WHEN** two stories of `reporting` depend on stories of `core`, and one story of `core` depends on a story of `payments`
- **THEN** the Backlogs level shows `reporting`, `core` and `payments`, an arrow labelled 2 from `reporting` to `core` and an arrow labelled 1 from `core` to `payments`

#### Scenario: Links between two other backlogs
- **WHEN** `core` is open and a story of `reporting` depends on a story of `payments`
- **THEN** the Backlogs level shows the arrow from `reporting` to `payments`

#### Scenario: Backlog without links to others
- **WHEN** a backlog has no link with another backlog
- **THEN** it is listed under "No dependencies" with its story count

#### Scenario: Backlogs depend on each other
- **WHEN** a story of `core` depends on a story of `payments` and another story of `payments` depends on another story of `core`
- **THEN** both arrows are shown with a note that `core` and `payments` depend on each other, and no cycle warning

### Requirement: A cycle across backlogs is shown
At the Stories level, a cycle formed by the open backlog's links with a story of another backlog SHALL be reported as a dependency cycle, as a cycle inside the backlog is.

#### Scenario: Cycle through another backlog
- **WHEN** `B1-IAM-0001` of `core` depends on `B3-BIL-0002` of `payments`, and `B3-BIL-0002` depends on `B1-IAM-0001`
- **THEN** with `core` open, the graph draws both arrows, marks the cycle, and the cycle note is shown

### Requirement: The graph names a backlog it cannot read
When another backlog of the data folder cannot be read, the Graph tab SHALL say which, because its dashed nodes, arrows and Backlogs-level links are then missing. The links of the open backlog to that backlog SHALL NOT be listed as stories that do not exist.

#### Scenario: Backlog cannot be read
- **WHEN** `payments`' story file is missing or locked while `core` is open
- **THEN** a note under the graph says `payments` could not be read and its links are not shown
