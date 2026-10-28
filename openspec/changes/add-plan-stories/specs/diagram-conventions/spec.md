## ADDED Requirements

### Requirement: Single source of diagram rules
`planner/guidelines/diagram-conventions.md` SHALL be the only statement of the rules for a slice: palette and stereotypes, the three-file layout, step ids, naming, the analysis-level limits and the slice size limit. It SHALL match the mock slice in `planner/test/sample-data/diagrams/sample/sign-in/`, and the skill and the checks SHALL cite it rather than restate it.

#### Scenario: Rule changed once
- **WHEN** a palette color is changed in the conventions
- **THEN** no other file holds a second copy of that rule that must change with it

### Requirement: Slice layout
A slice SHALL be a folder `planner/data/diagrams/<backlog>/<slice>/` holding `source.json`, one specification `UC-<slice>.md`, one class diagram `UC-<slice>-class.puml` and one or more sequence diagrams `UC-<slice>-<flow>-sequence.puml`. Each `.puml` SHALL be self-contained, with the palette written inline and no `!include`, so it renders the same in the VS Code PlantUML plugin under any render mode. The slice name SHALL be a lowercase slug of the Epic, Feature or story Title.

#### Scenario: Self-contained file
- **WHEN** a `.puml` file of a slice contains `!include`
- **THEN** the check rejects it and names the line

### Requirement: Diagram content rules
Class and sequence diagrams SHALL color every element by its stereotype from the palette, and every `@startuml` name SHALL be unique across the backlog's diagrams. Sequence steps SHALL carry `phase.step` ids that increase within a phase and are unique within the file. Every participant SHALL be declared before use. The diagram files SHALL hold no story ID.

#### Scenario: Duplicate diagram name
- **WHEN** a draft `@startuml` name is already used by another file of the backlog
- **THEN** the check rejects it and names the other file

#### Scenario: Undeclared participant
- **WHEN** a sequence message names a participant that is not declared
- **THEN** the check rejects the file and names the participant

#### Scenario: Story ID in a diagram
- **WHEN** a `.puml` file contains text shaped like a story ID
- **THEN** the check rejects it

### Requirement: Specification content
`UC-<slice>.md` SHALL follow these sections: header table, Description, Preconditions, Main flow, Alternative and exception flows, Postconditions, Acceptance criteria. Every acceptance criterion of every story in scope SHALL appear as one row with a stable name (`AC-<slice>-<name>`) and the Given/when/then text, and every failure path in a criterion SHALL appear in a sequence diagram as an `alt` branch. The header's story list SHALL be generated from `source.json` and SHALL NOT be written by the model.

#### Scenario: Missing criterion
- **WHEN** a story in scope has a criterion with no row in the specification
- **THEN** the check rejects the slice and names the story by Title and the criterion

#### Scenario: Failure path without a branch
- **WHEN** a criterion describes a failure and no sequence diagram has a matching `alt` branch
- **THEN** the check reports the criterion as uncovered

### Requirement: Analysis-level limits
Without a repo, the files SHALL contain no file path, library name or infrastructure element that no story names and the user has not confirmed, SHALL set Maturity to planned, and SHALL mark the Implementation overview and Traceability sections `TBC`. With a repo, a traceability row SHALL name a file and symbol that `repo_read` returned in the session.

#### Scenario: Invented path
- **WHEN** a traceability row names a path the session never read
- **THEN** the check or the skill rejects the row

### Requirement: Slice size limit
A class diagram SHALL hold at most 12 classes; a slice that needs more SHALL be split by Feature. The limit is a value of the conventions document, not of the checks' code.

#### Scenario: Thirteen classes
- **WHEN** a class diagram declares 13 classes
- **THEN** the check reports it and names the limit

### Requirement: Mock and fixture
`planner/test/sample-data/diagrams/` SHALL hold a mock slice built from the sample backlog's Epic, Feature and stories, written in the committed layout, which the checks' tests read. It SHALL NOT contain content from a real backlog or repo.

#### Scenario: Mock passes the checks
- **WHEN** the checks run on the mock slice
- **THEN** they report no problem
