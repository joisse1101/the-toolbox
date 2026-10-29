## MODIFIED Requirements

### Requirement: Links to stories
`source.json` SHALL record the slice's scope (Epic, Feature or story) and, for each story in scope, its `id`, `title` and a hash of its text. The diagrams SHALL hold no story ID; only the specification's generated story list does. `write_diagram` SHALL take the stories as `{id, title}` pairs, require the Title to match the backlog as the backlog tools do, and write the hashes itself.

#### Scenario: Title does not match
- **WHEN** `write_diagram` is given an ID whose story now has another Title
- **THEN** nothing is written and the reply says what the ID holds and which stories have that Title

### Requirement: Healing shifted IDs
`read_diagrams` SHALL match each story of a slice to the backlog by Title and scope. When the Title matches exactly one story whose ID differs, it SHALL update that `id` in `source.json`, regenerate the specification's story list and report the change, and every other byte of the document, the diagrams included, SHALL stay as it was. When two stories share the Title, it SHALL use Epic and Feature to choose and SHALL report the story as ambiguous when it cannot.

#### Scenario: Story moved by a renumber
- **WHEN** a story's ID changed because another story was added before it
- **THEN** the next read shows the new ID in `source.json` and the specification's list, and says so

#### Scenario: Diagrams untouched by a repair
- **WHEN** a repair rewrites the generated story list of a document that holds diagrams
- **THEN** every `mermaid` block of the document is byte-for-byte as before

#### Scenario: Ambiguous Title
- **WHEN** two stories with the same Title are both in the Epic and Feature
- **THEN** the slice is reported ambiguous for that story and `source.json` is not changed for it

### Requirement: Validation before writing
`check_diagram` and `write_diagram` SHALL apply the same checks of `diagram-conventions`, including Mermaid's own parser on every `mermaid` block, and report every problem found, each naming the document and the heading, line or story. `check_diagram` writes nothing. One failing diagram or section SHALL write nothing of the slice.

#### Scenario: One bad file
- **WHEN** the document fails a check, in one diagram or in one section
- **THEN** nothing is written and the reply lists each problem with the heading of its diagram or section

#### Scenario: Parser error reported
- **WHEN** a block does not parse
- **THEN** the reply carries the parser's message and the line within the block
