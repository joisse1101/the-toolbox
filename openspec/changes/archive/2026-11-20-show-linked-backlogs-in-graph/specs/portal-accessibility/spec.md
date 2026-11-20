# Spec Delta

## MODIFIED Requirements

### Requirement: Graph legend
The Graph tab SHALL show a legend that says what the node colours mean and how a selected node's dependencies and dependents are marked. When the graph shows a dashed node, the legend SHALL say that a dashed node is a story or group of another backlog.

#### Scenario: Legend present
- **WHEN** the Graph tab shows stories
- **THEN** a legend lists each colour with its meaning

#### Scenario: Dashed node explained
- **WHEN** the graph shows a dashed node for another backlog
- **THEN** the legend has an entry for the dashed node that says it belongs to another backlog
