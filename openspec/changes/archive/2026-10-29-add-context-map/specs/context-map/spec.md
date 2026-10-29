## Purpose

Defines a backlog's context map: the bounded contexts, the Epics each holds, the links between contexts, where it is stored, how it is checked and written, and how it stays in step with the backlog. It gives stakeholders one overview and gives `plan-stories` the boundaries a slice is cut from.

## ADDED Requirements

### Requirement: Map files
A backlog's context map SHALL be two files at the backlog level of the diagrams folder, `planner/data/diagrams/<backlog>/context-map.json` (the source) and `context-map.md` (the document), and SHALL NOT be a folder. The map SHALL be optional: a backlog without one works as before. `read_diagrams` SHALL NOT list the map as a slice.

#### Scenario: No map
- **WHEN** a backlog has no `context-map.json`
- **THEN** `plan-stories` works as before and nothing reports the map as missing

#### Scenario: Map is not a slice
- **WHEN** `read_diagrams` lists the slices of a backlog that has a map
- **THEN** the map is not among them

### Requirement: Contexts and Epics
The source SHALL list contexts, each with a name, a purpose, an owner and the Epics it holds. A context SHALL hold one or more Epics, and every Epic of the backlog SHALL be in exactly one context. A context that holds more than one Epic SHALL record the reason for the merge. An owner MAY be `TBC`.

#### Scenario: Epic in no context
- **WHEN** an Epic of the backlog is in no context of the map
- **THEN** the check rejects the map and names the Epic

#### Scenario: Epic in two contexts
- **WHEN** an Epic is listed under two contexts
- **THEN** the check rejects the map and names the Epic and both contexts

#### Scenario: Unknown Epic
- **WHEN** a context lists an Epic the backlog does not hold
- **THEN** the check rejects the map and names the Epic

#### Scenario: Merge without a reason
- **WHEN** a context holds two Epics and records no reason
- **THEN** the check rejects the map and names the context

### Requirement: Relationships between contexts
The source SHALL list the relationships between contexts, each with the upstream context, the downstream context, a type and what crosses the link. The type SHALL be one of customer-supplier, anti-corruption-layer, shared-kernel, conformist, published-events, or `TBC`, and what crosses MAY be `TBC`. A relationship SHALL join two contexts of the map and SHALL NOT join a context to itself.

#### Scenario: Link to an unknown context
- **WHEN** a relationship names a context the map does not list
- **THEN** the check rejects the map and names the context

#### Scenario: Unknown type
- **WHEN** a relationship has a type outside the list
- **THEN** the check rejects the map and names the type

### Requirement: Facts only
The checks SHALL test facts about the map (coverage of the Epics, names, types, valid references) and SHALL NOT judge whether a split of contexts is a good one. Advice on splits and merges SHALL come from the skill, with a reason, and the decision SHALL be the user's.

#### Scenario: Questionable merge
- **WHEN** a map merges two Epics whose terms differ in meaning
- **THEN** the check accepts it if the reason is recorded, and the skill is where the doubt is raised

### Requirement: Document for readers
`context-map.md` SHALL hold a table of the contexts (name, owner, Epics, purpose), a table of the relationships, and one `mermaid` flowchart with a subgraph per context and a labelled link per relationship from upstream to downstream. The writer SHALL generate the document from the source, so the two cannot differ, and the flowchart SHALL pass Mermaid's own parser. The init line required of sequence diagrams SHALL NOT be required of the flowchart.

#### Scenario: Document follows the source
- **WHEN** the source is written
- **THEN** every context and relationship of the source appears in both tables and in the flowchart

### Requirement: Map tools
The `diagram-tools` server SHALL have a tool that reads the map, a tool that checks a map and writes nothing, and a tool that writes it. The write SHALL apply the same checks, write the source and the document atomically, read them back and fail naming what is missing, change nothing when the same map is sent again, never delete a file, write only under the backlog's diagrams folder, and append a line to `planner/data/logs/writes.jsonl` with no contents. A refused write SHALL write neither file.

#### Scenario: Repeated write
- **WHEN** the same map is written twice
- **THEN** the second call changes no byte and says nothing changed

#### Scenario: Refused write
- **WHEN** a map fails a check
- **THEN** neither file is written and the reply lists each problem

### Requirement: Map follows the backlog
The read tool SHALL compare the map with the Epics of the backlog and report Epics that the map lacks, Epics the backlog no longer holds, and a renamed Epic as one of the two, without changing the map.

#### Scenario: Epic added since the map was drawn
- **WHEN** the backlog gains an Epic
- **THEN** the read reports the Epic as in no context and changes no file
