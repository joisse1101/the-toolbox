## ADDED Requirements

### Requirement: Graph groups linked stories into clusters
The Graph tab SHALL group linked stories into clusters: a cluster holds every story connected to one another by dependencies, directly or through other stories. Each cluster SHALL be drawn in its own band, labelled with its number and story count, and the bands SHALL be stacked vertically with a visible gap between them, the cluster with the most stories first. A story or arrow SHALL NOT be drawn in a band of another cluster.

#### Scenario: Unrelated chains are separate
- **WHEN** a backlog has a chain A, B, C of dependent stories and a separate chain P, Q that shares no story with it
- **THEN** the graph shows two bands, "Cluster 1 · 3 stories" holding A, B and C and "Cluster 2 · 2 stories" holding P and Q, and no node of one band shares a row of the other

#### Scenario: Dependent stories stay together
- **WHEN** a story depends on stories that themselves depend on others
- **THEN** all of them are in the same band

#### Scenario: Largest cluster first
- **WHEN** a backlog has clusters of 2, 5 and 3 stories
- **THEN** the bands are shown in the order 5, 3, 2, and ties keep the order of their first story in the backlog

#### Scenario: A link joins two clusters
- **WHEN** the user links a story of one cluster to a story of another
- **THEN** the two clusters are shown as one band

#### Scenario: Removing a link splits a cluster
- **WHEN** the user removes the only dependency joining two groups of stories
- **THEN** the groups are shown as two bands

### Requirement: Graph arrows do not cross nodes
An arrow in the Graph tab SHALL NOT pass through a node other than the two it connects. An arrow between stories more than one column apart SHALL be routed through the space between nodes of the columns it crosses.

#### Scenario: Arrow skipping a column
- **WHEN** story C depends on story A and a story B sits in the column between them
- **THEN** the arrow from C to A passes above or below B, not through it

#### Scenario: Crossings are kept low
- **WHEN** the stories of a column depend on stories at different heights in an earlier column
- **THEN** they are ordered so that arrows do not cross where an order without crossings exists

#### Scenario: Arrows stay selectable
- **WHEN** the user clicks or focuses a routed arrow
- **THEN** it is selected and can be removed as before

#### Scenario: Cycle arrows
- **WHEN** the backlog has a dependency cycle
- **THEN** the graph is still drawn and the arrow that closes the cycle is marked as before, and it need not avoid nodes
