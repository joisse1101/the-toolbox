# Spec Delta

## MODIFIED Requirements

### Requirement: Single source of diagram rules
`diagram-conventions.md`, as bundled in the `references/` folder of `jois-story-plan`, SHALL be the only statement of the rules for a slice: stereotypes, the one-document layout, the Mermaid subset, step ids and phases, naming, the design-level target and checklist, the no-repo limits and the slice size limit. It SHALL match the mock slice kept with the plan skill's tests, and the skill and the checks SHALL cite it rather than restate it.

#### Scenario: Rule changed once
- **WHEN** the class limit is changed in the conventions
- **THEN** no other file holds a second copy of that rule that must change with it

### Requirement: Limits without a repo
Without a repo, the files SHALL contain no file path, library name or infrastructure element that no story names and the user has not confirmed, SHALL set Maturity to planned, and SHALL mark the Implementation overview and Traceability sections `TBC`. Technology the user has confirmed SHALL be recorded as a `user-confirmed` row of `## Design decisions` and MAY then be drawn. With a repo, a traceability row SHALL name a file and symbol that the skill read from the repo with the session's file tools.

#### Scenario: Invented path
- **WHEN** a traceability row names a path the session never read
- **THEN** the skill rejects the row

#### Scenario: Confirmed technology
- **WHEN** the user confirms a cookie-based session in the design checkpoint
- **THEN** the diagram may show the cookie and a `user-confirmed` decision row records it

### Requirement: Mock and fixture
A mock slice kept with the plan skill's tests SHALL be built from the sample backlog's Epic, Feature and stories, written in the committed layout and at design level (contracts, failure responses, decisions and the criterion-to-step trace), and the checks' tests SHALL read it. It SHALL NOT contain content from a real backlog or repo.

#### Scenario: Mock passes the checks
- **WHEN** the checks run on the mock slice
- **THEN** they report no problem

### Requirement: Context map rules
`diagram-conventions.md` SHALL state the rules of the context map in a section of its own: the fields of a context and a relationship, the relationship types, the rule that every Epic is in exactly one context and that a merge records its reason, and the form of the flowchart. The checks and the skill SHALL cite that section and SHALL NOT restate it.

#### Scenario: Rule changed once
- **WHEN** a relationship type is added in the conventions
- **THEN** no other file holds a second list of types that must change with it
