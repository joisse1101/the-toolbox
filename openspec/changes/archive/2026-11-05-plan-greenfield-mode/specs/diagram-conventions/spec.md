## MODIFIED Requirements

### Requirement: Limits without a repo
A slice SHALL be in one of three modes. In **describe-only** mode (no code to read, the slice describes a design), the files SHALL contain no file path, library name or infrastructure element that no story names and the user has not confirmed, SHALL set Maturity to `planned`, and SHALL mark the Implementation overview and Traceability sections `TBC`. In **greenfield** mode (the code does not exist and the story builds it), Maturity SHALL read `planned (greenfield)`, the Implementation overview SHALL hold the build plan, and each Traceability row SHALL name a `` `file::symbol` `` marked `planned`; a file path SHALL appear only if a `user-confirmed` row of `## Design decisions` records the project layout or stack, and a decision with source `repo` SHALL be refused. In **repo** mode (the code exists), a traceability row SHALL name a file and symbol that the skill read from the repo with the session's file tools. Technology the user has confirmed SHALL be recorded as a `user-confirmed` row of `## Design decisions` and MAY then be drawn.

#### Scenario: Invented path
- **WHEN** a traceability row names a path the session never read, in a slice that is not in greenfield mode
- **THEN** the skill rejects the row

#### Scenario: Confirmed technology
- **WHEN** the user confirms a cookie-based session in the design checkpoint
- **THEN** the diagram may show the cookie and a `user-confirmed` decision row records it

#### Scenario: Build plan for an empty repo
- **WHEN** Maturity reads `planned (greenfield)`, the Implementation overview holds a build plan, every Traceability row names a `file::symbol` marked `planned`, and a `user-confirmed` decision records the project layout
- **THEN** the slice passes the mode's checks

#### Scenario: Planned path with no confirmed layout
- **WHEN** a greenfield slice names a file path and no `user-confirmed` decision records the project layout or stack
- **THEN** the slice is rejected

#### Scenario: Greenfield row not marked planned
- **WHEN** a greenfield Traceability row names a `file::symbol` without the `planned` mark
- **THEN** the row is rejected
