## ADDED Requirements

### Requirement: Rendering target
Diagrams SHALL be Mermaid class diagrams and sequence diagrams, each in a fenced `mermaid` block of the slice's markdown document, written in the subset of Mermaid syntax that renders in GitHub and in the built-in VS Code markdown preview. The conventions SHALL name that subset and say how to view a slice. A fence of another diagram type SHALL be rejected.

#### Scenario: Other diagram type
- **WHEN** a fence in a slice's document opens with a diagram type other than a class diagram or a sequence diagram
- **THEN** the check rejects it, names the heading above the fence and says which types are accepted

#### Scenario: Mock slice renders in both viewers
- **WHEN** the mock slice is opened in GitHub and in the built-in VS Code markdown preview
- **THEN** every diagram of it draws, with no error in place of a picture

### Requirement: Mermaid diagram content rules
Class and sequence diagrams SHALL state a stereotype in the label of every class and participant, taken from the stereotypes of the conventions, so that the layers read without color. Color is optional and SHALL NOT be checked. Every `mermaid` block SHALL be valid Mermaid as Mermaid's own parser judges it. Sequence steps SHALL carry `phase.step` ids in the message text that increase within a phase and are unique within the diagram. A phase SHALL be a `rect` block whose first line is a `Note over` line reading `Phase <n> - <name>`, and the first number of every step id SHALL be the number of the phase it is in. Every participant SHALL be declared before use. Diagrams SHALL hold no story ID.

#### Scenario: Undeclared participant
- **WHEN** a sequence message names a participant that is not declared
- **THEN** the check rejects the document and names the participant and its diagram

#### Scenario: Missing stereotype
- **WHEN** a class or participant label states no stereotype, or one that is not in the conventions
- **THEN** the check rejects the document and names the class or participant

#### Scenario: Step in the wrong phase
- **WHEN** a step id starts with a number other than the phase of the `rect` block it is in
- **THEN** the check rejects it and names the step and the phase

#### Scenario: Story ID in a diagram
- **WHEN** a `mermaid` block contains text shaped like a story ID
- **THEN** the check rejects it

#### Scenario: Diagram that does not parse
- **WHEN** a `mermaid` block is not valid Mermaid
- **THEN** the check rejects the document and names the heading above the block and the parser's message with its line

### Requirement: One-document slice layout
A slice SHALL be a folder `planner/data/diagrams/<backlog>/<slice>/` holding `source.json` and one document `UC-<slice>.md`. The document SHALL hold the specification and every diagram of the slice, each diagram being one `mermaid` block under its own heading (see Specification content). The slice SHALL hold no other diagram file. The slice name SHALL be a lowercase slug of the Epic, Feature or story Title.

#### Scenario: A second document is sent
- **WHEN** a file other than `UC-<slice>.md` is submitted for a slice
- **THEN** the check rejects it, names the file and says a slice is one document plus `source.json`

### Requirement: Readable in both themes
Every sequence diagram SHALL open with the one init line that the conventions give, which fixes the color of the message text to suit the phase fill, so that the diagram reads on GitHub and in the VS Code markdown preview in both their light and dark themes. The conventions SHALL show the line and the phase fill it goes with.

#### Scenario: Sequence diagram without the init line
- **WHEN** a sequence diagram does not open with the init line, or opens with a different one
- **THEN** the check rejects the document, names the diagram and shows the line it must open with

## MODIFIED Requirements

### Requirement: Single source of diagram rules
`planner/guidelines/diagram-conventions.md` SHALL be the only statement of the rules for a slice: stereotypes, the one-document layout, the Mermaid subset, step ids and phases, naming, the analysis-level limits and the slice size limit. It SHALL match the mock slice in `planner/test/sample-data/diagrams/sample/sign-in/`, and the skill and the checks SHALL cite it rather than restate it.

#### Scenario: Rule changed once
- **WHEN** the class limit is changed in the conventions
- **THEN** no other file holds a second copy of that rule that must change with it

### Requirement: Specification content
`UC-<slice>.md` SHALL follow these sections: header table, Description, Preconditions, Main flow, Alternative and exception flows, Postconditions, Acceptance criteria, `## Class diagram` and `## Sequence diagrams`. `## Class diagram` SHALL hold exactly one `mermaid` block. `## Sequence diagrams` SHALL hold one `### Sequence: <flow>` heading per flow, each with exactly one `mermaid` block. Every acceptance criterion of every story in scope SHALL appear as one row with a stable name (`AC-<slice>-<name>`), the Given/when/then text and a `Flow` naming one of those flow headings, and every failure path in a criterion SHALL appear in that flow's sequence diagram as an `alt` branch. The header's story list SHALL be generated from `source.json` and SHALL NOT be written by the model.

#### Scenario: Missing criterion
- **WHEN** a story in scope has a criterion with no row in the specification
- **THEN** the check rejects the slice and names the story by Title and the criterion

#### Scenario: Failure path without a branch
- **WHEN** a criterion describes a failure and its flow's sequence diagram has no matching `alt` branch
- **THEN** the check reports the criterion as uncovered

#### Scenario: Flow without a diagram
- **WHEN** an acceptance-criteria row names a flow that has no `### Sequence: <flow>` heading
- **THEN** the check rejects the row and names the flow

#### Scenario: Block under no heading
- **WHEN** a `mermaid` block is not under `## Class diagram` or a `### Sequence: <flow>` heading
- **THEN** the check rejects the document and names the line of the block

#### Scenario: Heading without a block
- **WHEN** a diagram heading has no `mermaid` block, or more than one
- **THEN** the check rejects the document and names the heading

## REMOVED Requirements

### Requirement: Diagram content rules
**Reason**: The rules named the PlantUML palette colors, the `@startuml` name unique across the backlog, and `.puml` files. The palette and the name rule do not exist in Mermaid, and color is now optional.
**Migration**: Replaced by `Mermaid diagram content rules` (stereotype in the label, valid Mermaid, `phase.step` ids and phases, declared participants, no story ID). The unique-name rule is dropped: a diagram is named by its heading and the slice name is already unique in the backlog.

### Requirement: Slice layout
**Reason**: The layout was a specification plus one `.puml` file per diagram, each self-contained with an inline palette and no `!include`. Diagrams are now Mermaid blocks inside the one document, so the separate files and the `!include` rule have no counterpart.
**Migration**: Replaced by `One-document slice layout`. No slice in the old layout exists to migrate.
