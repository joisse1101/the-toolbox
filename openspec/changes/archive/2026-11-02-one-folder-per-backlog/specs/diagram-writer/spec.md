## MODIFIED Requirements

### Requirement: Diagram tools server
The repository SHALL contain a stdio MCP server, `planner/claude/mcp/diagram-tools.mjs`, with typed tools `read_diagrams`, `check_diagram` and `write_diagram`, the map tools of the `context-map` capability, and `repo_tree`, `repo_grep` and `repo_read` when the backlog has a valid `repo.json`. It SHALL change nothing except through `write_diagram`, the map write and the repair that `read_diagrams` makes to a slice's `source.json` and generated story list (see Healing shifted IDs), and each SHALL write only under `<backlog>/slices/<slice>/`, or, for the map, under `<backlog>/`. `read_diagrams`, `check_diagram` and the map's read and check SHALL never change a diagram, or a specification outside its generated story list. `slices` SHALL NOT be a kind of the file API.

#### Scenario: Path outside the diagrams folder
- **WHEN** `write_diagram` is called with a slice name that would resolve outside the backlog's slices folder
- **THEN** nothing is written and the reply names the rule

#### Scenario: Not reachable from the portal
- **WHEN** the file API is asked for the kind `slices`
- **THEN** it is refused as unknown
