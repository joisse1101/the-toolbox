## MODIFIED Requirements

### Requirement: Map files
A backlog's context map SHALL be two files in the backlog folder, `<backlog>/context-map.json` (the source) and `context-map.md` (the document), and SHALL NOT be a folder. The map SHALL be optional: a backlog without one works as before. `read_diagrams` SHALL NOT list the map as a slice.

#### Scenario: No map
- **WHEN** a backlog has no `context-map.json`
- **THEN** `plan-stories` works as before and nothing reports the map as missing

#### Scenario: Map is not a slice
- **WHEN** `read_diagrams` lists the slices of a backlog that has a map
- **THEN** the map is not among them
