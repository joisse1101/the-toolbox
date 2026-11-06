# Spec Delta

## MODIFIED Requirements

### Requirement: Design sections of the specification
After `## Sequence diagrams`, `UC-<slice>.md` SHALL hold, in this order and under these exact headings, `## Design decisions`, `## Interface contracts`, `## Failure responses`, `## Non-functional and security rules`, `## Open questions` and `## Changes to existing specs`, followed by `## Implementation overview` and `## Traceability`. `## Design decisions` SHALL be a table with the columns decision id, decision, alternatives, why, source (`user-confirmed`, `repo` or `TBC`) and steps affected. `## Interface contracts` SHALL give, per flow, the method and path or message, the request, the success response and the steps. `## Failure responses` SHALL give, per failure, its trigger, the response the client receives, the acceptance criterion and the step. `## Non-functional and security rules` SHALL give each rule, its source and the steps. `## Open questions` SHALL list each unconfirmed item and whether it blocks. `## Changes to existing specs` is defined by its own requirement. A section that does not apply SHALL say so rather than be left out.

#### Scenario: Section missing
- **WHEN** a specification lacks one of the six sections
- **THEN** the check rejects the slice and names the heading

#### Scenario: Decision without a source
- **WHEN** a design-decision row has no source or a source other than `user-confirmed`, `repo` or `TBC`
- **THEN** the check rejects the row

## ADDED Requirements

### Requirement: Changes to existing specs section
`## Changes to existing specs` SHALL be a table with the columns Change, Wiki page, What changes and Reason, or the single word `None`. `Change` SHALL be `added`, `modified` or `removed`. `Wiki page` SHALL be a path under `wiki/` that ends in `.md`, written without the `wiki/` prefix. The conventions SHALL define the section and the checks SHALL cite it.

#### Scenario: Row with a valid change
- **WHEN** a row reads `modified | planner/Story-Skills.md | one role becomes many | Story says a user can hold many roles`
- **THEN** the check accepts it

#### Scenario: Unknown change word
- **WHEN** a row's Change is `updated`
- **THEN** the check rejects the row and says the word must be added, modified or removed

#### Scenario: Page is not a wiki path
- **WHEN** a row's Wiki page does not end in `.md` or starts with `wiki/`
- **THEN** the check rejects the row and names it

#### Scenario: Section left empty
- **WHEN** the section holds neither a table nor `None`
- **THEN** the check rejects the slice and names the heading

### Requirement: Changes are not applied by the slice
A row of `## Changes to existing specs` SHALL record a change to be made, not one already made. The slice and its checks SHALL NOT read, edit or verify a wiki page, and SHALL NOT mark a row as applied. The conventions SHALL say that archive applies the rows.

#### Scenario: Page does not exist
- **WHEN** a row marked `added` names a page that is not in `wiki/`
- **THEN** the check accepts the row

#### Scenario: Row with a status column
- **WHEN** a row has a fifth cell, such as a status of applied
- **THEN** the check rejects the row and says the table has the four columns Change, Wiki page, What changes and Reason
