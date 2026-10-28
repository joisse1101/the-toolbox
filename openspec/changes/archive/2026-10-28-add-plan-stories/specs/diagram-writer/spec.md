## ADDED Requirements

### Requirement: Diagram tools server
The repository SHALL contain a stdio MCP server, `planner/claude/mcp/diagram-tools.mjs`, with typed tools `read_diagrams`, `check_diagram` and `write_diagram`, and `repo_tree`, `repo_grep` and `repo_read` when the backlog has a valid `repo.json`. It SHALL change nothing except through `write_diagram` and the repair that `read_diagrams` makes to a slice's `source.json` and generated story list (see Healing shifted IDs), and each SHALL write only under `planner/data/diagrams/<backlog>/<slice>/`. `read_diagrams` and `check_diagram` SHALL never change a diagram, or a specification outside its generated story list. `diagrams` SHALL NOT be a store of the file API.

#### Scenario: Path outside the diagrams folder
- **WHEN** `write_diagram` is called with a slice name that would resolve outside the backlog's diagrams folder
- **THEN** nothing is written and the reply names the rule

#### Scenario: Not reachable from the portal
- **WHEN** the file API is asked for the `diagrams` store
- **THEN** it is refused as an unknown store

### Requirement: Links to stories
`source.json` SHALL record the slice's scope (Epic, Feature or story) and, for each story in scope, its `id`, `title` and a hash of its text. The diagram files SHALL hold no story ID. `write_diagram` SHALL take the stories as `{id, title}` pairs, require the Title to match the backlog as the backlog tools do, and write the hashes itself.

#### Scenario: Title does not match
- **WHEN** `write_diagram` is given an ID whose story now has another Title
- **THEN** nothing is written and the reply says what the ID holds and which stories have that Title

### Requirement: Healing shifted IDs
`read_diagrams` SHALL match each story of a slice to the backlog by Title and scope. When the Title matches exactly one story whose ID differs, it SHALL update that `id` in `source.json`, regenerate the specification's story list and report the change. When two stories share the Title, it SHALL use Epic and Feature to choose and SHALL report the story as ambiguous when it cannot.

#### Scenario: Story moved by a renumber
- **WHEN** a story's ID changed because another story was added before it
- **THEN** the next read shows the new ID in `source.json` and the specification's list, and says so

#### Scenario: Ambiguous Title
- **WHEN** two stories with the same Title are both in the Epic and Feature
- **THEN** the slice is reported ambiguous for that story and `source.json` is not changed for it

### Requirement: Stale detection
`read_diagrams` SHALL report a slice stale when a story's hash differs from the one recorded, a story is missing from the backlog, or the Epic or Feature now holds a story the slice does not list. It SHALL name each story by Title and say which of the three applies, and SHALL NOT change the diagram files.

#### Scenario: Story reworded
- **WHEN** a story's User Story or criteria changed since the slice was written
- **THEN** the read lists the story as changed

#### Scenario: Story added to the Feature
- **WHEN** a Feature slice's Feature gains a story
- **THEN** the read lists the story as new

### Requirement: Validation before writing
`check_diagram` and `write_diagram` SHALL apply the same checks of `diagram-conventions` and report every problem found, each naming the file and the line or story. `check_diagram` writes nothing. One failing file SHALL write no file of the slice.

#### Scenario: One bad file
- **WHEN** one of three files fails a check
- **THEN** none is written and the reply lists each problem

### Requirement: Atomic and idempotent writes
`write_diagram` SHALL write each file atomically and re-read the slice afterwards, failing and naming what is missing if the folder does not hold what was sent. Sending the same slice again SHALL leave the files byte-for-byte unchanged. It SHALL NOT overwrite a slice of another scope under the same name, and SHALL NOT delete files it did not write.

#### Scenario: Repeated write
- **WHEN** the same slice is written twice
- **THEN** the second call changes no byte and says nothing changed

#### Scenario: Same name, different scope
- **WHEN** a slice with that name exists for another Epic or Feature
- **THEN** the write is refused and names the existing scope

### Requirement: Write log
Every `write_diagram` SHALL append one line to `planner/data/logs/writes.jsonl` with the time, writer, backlog, slice, bytes and a short hash and no contents, as the other writers do.

#### Scenario: Log line
- **WHEN** a slice is written
- **THEN** `writes.jsonl` gains one line for it and the line holds no diagram text
