## ADDED Requirements

### Requirement: Design-level target
Every slice SHALL be design-level and implementation-bound, with or without a repo: a developer can implement from it and a tester can derive test cases from it. A conceptual, business-level diagram (generic verbs, no boundary, no stated outcome of a failure) SHALL be treated as a defect. The conventions SHALL state this target and the self-check "could a developer implement this and a tester derive cases from it? if not, go down a level".

#### Scenario: Conceptual flow
- **WHEN** a sequence diagram names no entry contract, datastore or failure outcome for a flow
- **THEN** the conventions classify it as below the target and the skill goes down a level before showing it

### Requirement: Completeness checklist
The conventions SHALL list what every flow of a slice states: the entry contract (method and path, or message, and payload), the validation layer, the owner of credential or rule verification, datastores and ports, any session or token artifact and how it is delivered, each failure with the response the client receives, security behaviour, and the redirect or hand-off target. A flow SHALL state an item or record why it does not apply.

#### Scenario: Item missing from a flow
- **WHEN** a flow neither states an item of the checklist nor records that it does not apply
- **THEN** the skill treats the flow as incomplete and asks the user or the repo for it before showing the slice

### Requirement: One branch per distinct failure
Each distinct failure of a flow (for example not found, wrong credential, inactive account, invalid input) SHALL have its own `alt` branch in the sequence diagram and its own row in `## Failure responses`. Two failures SHALL share a branch only when the user, or at repo level the code, states that their responses are deliberately the same, and the row SHALL say so.

#### Scenario: Merged failure without a statement
- **WHEN** two failures that differ in cause share one branch and nothing records that the merge is intended
- **THEN** the check or the skill reports the merge

### Requirement: Aggregate boundary
In the class diagram, each root entity SHALL be drawn inside one aggregate boundary together with the classes it owns, and the boundary SHALL carry one line naming the rule the aggregate protects. A class outside the boundary SHALL be linked only to the root. The boundary SHALL NOT count toward the class limit. A shared-class stub SHALL show only the root of an aggregate that another slice owns. The rule SHALL also appear as a row of `## Design decisions`.

#### Scenario: Arrow into an inner class
- **WHEN** a class outside an aggregate boundary has a relationship to a class inside it that is not the root
- **THEN** the check rejects the diagram and names both classes

#### Scenario: Root without a boundary
- **WHEN** a `«root entity»` is not inside an aggregate boundary
- **THEN** the check rejects the diagram and names the root

#### Scenario: Boundary without a rule
- **WHEN** an aggregate boundary has no line naming the rule it protects
- **THEN** the check rejects the diagram and names the aggregate

### Requirement: Design sections of the specification
After `## Sequence diagrams`, `UC-<slice>.md` SHALL hold, in this order and under these exact headings, `## Design decisions`, `## Interface contracts`, `## Failure responses`, `## Non-functional and security rules` and `## Open questions`, followed by `## Implementation overview` and `## Traceability`. `## Design decisions` SHALL be a table with the columns decision id, decision, alternatives, why, source (`user-confirmed`, `repo` or `TBC`) and steps affected. `## Interface contracts` SHALL give, per flow, the method and path or message, the request, the success response and the steps. `## Failure responses` SHALL give, per failure, its trigger, the response the client receives, the acceptance criterion and the step. `## Non-functional and security rules` SHALL give each rule, its source and the steps. `## Open questions` SHALL list each unconfirmed item and whether it blocks. A section that does not apply SHALL say so rather than be left out.

#### Scenario: Section missing
- **WHEN** a specification lacks one of the five sections
- **THEN** the check rejects the slice and names the heading

#### Scenario: Decision without a source
- **WHEN** a design-decision row has no source or a source other than `user-confirmed`, `repo` or `TBC`
- **THEN** the check rejects the row

### Requirement: Criterion to step trace
The acceptance-criteria table SHALL have a `Steps` column naming the sequence step ids that realise each criterion. Every id SHALL exist in the diagram of the row's `Flow`.

#### Scenario: Unknown step id
- **WHEN** a criterion row names a step id that its flow's diagram does not contain
- **THEN** the check rejects the row and names the id

## RENAMED Requirements

- FROM: `### Requirement: Analysis-level limits`
- TO: `### Requirement: Limits without a repo`

## MODIFIED Requirements

### Requirement: Single source of diagram rules
`planner/guidelines/diagram-conventions.md` SHALL be the only statement of the rules for a slice: stereotypes, the one-document layout, the Mermaid subset, step ids and phases, naming, the design-level target and checklist, the no-repo limits and the slice size limit. It SHALL match the mock slice in `planner/test/sample-data/diagrams/sample/sign-in/`, and the skill and the checks SHALL cite it rather than restate it.

#### Scenario: Rule changed once
- **WHEN** the class limit is changed in the conventions
- **THEN** no other file holds a second copy of that rule that must change with it

### Requirement: Specification content
`UC-<slice>.md` SHALL follow these sections: header table, Description, Preconditions, Main flow, Alternative and exception flows, Postconditions, Acceptance criteria, `## Class diagram`, `## Sequence diagrams`, then the design sections (see Design sections of the specification), Implementation overview and Traceability. `## Class diagram` SHALL hold exactly one `mermaid` block, and `## Sequence diagrams` one `### Sequence: <flow>` heading per flow, each with exactly one block. Every acceptance criterion of every story in scope SHALL appear as one row with a stable name (`AC-<slice>-<name>`), the Given/when/then text, a `Flow` naming one of those flow headings, and its `Steps`, and every failure path in a criterion SHALL appear in a sequence diagram as an `alt` branch. The header's story list SHALL be generated from `source.json` and SHALL NOT be written by the model.

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

### Requirement: Mock and fixture
`planner/test/sample-data/diagrams/` SHALL hold a mock slice built from the sample backlog's Epic, Feature and stories, written in the committed layout and at design level (contracts, failure responses, decisions and the criterion-to-step trace), which the checks' tests read. It SHALL NOT contain content from a real backlog or repo.

#### Scenario: Mock passes the checks
- **WHEN** the checks run on the mock slice
- **THEN** they report no problem

### Requirement: Limits without a repo
Without a repo, the files SHALL contain no file path, library name or infrastructure element that no story names and the user has not confirmed, SHALL set Maturity to planned, and SHALL mark the Implementation overview and Traceability sections `TBC`. Technology the user has confirmed SHALL be recorded as a `user-confirmed` row of `## Design decisions` and MAY then be drawn. With a repo, a traceability row SHALL name a file and symbol that `repo_read` returned in the session.

#### Scenario: Invented path
- **WHEN** a traceability row names a path the session never read
- **THEN** the check or the skill rejects the row

#### Scenario: Confirmed technology
- **WHEN** the user confirms a cookie-based session in the design checkpoint
- **THEN** the diagram may show the cookie and a `user-confirmed` decision row records it
