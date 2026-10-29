## ADDED Requirements

### Requirement: Context map rules
`planner/guidelines/diagram-conventions.md` SHALL state the rules of the context map in a section of its own: the fields of a context and a relationship, the relationship types, the rule that every Epic is in exactly one context and that a merge records its reason, and the form of the flowchart. The checks and the skill SHALL cite that section and SHALL NOT restate it.

#### Scenario: Rule changed once
- **WHEN** a relationship type is added in the conventions
- **THEN** no other file holds a second list of types that must change with it

### Requirement: Stub of another context's entity
A slice that shows an entity owned by another context SHALL draw it as a stub (the stereotype, the name and `(see <slice>)`, no members) and, when the backlog has a context map, SHALL state the type of the relationship between the two contexts on the link to the stub. A slice SHALL draw an entity in full only in the context that owns it.

#### Scenario: Stub across contexts
- **WHEN** the Billing slice shows a Member that the Accounts context owns, and the map links Accounts to Billing as customer-supplier
- **THEN** the Member is a stub and its link names customer-supplier

#### Scenario: No map
- **WHEN** the backlog has no context map
- **THEN** a stub is drawn as before, with no relationship type
