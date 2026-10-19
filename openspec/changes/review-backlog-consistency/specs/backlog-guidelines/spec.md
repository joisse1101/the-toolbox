## ADDED Requirements

### Requirement: Edge-case checklist
The guidelines SHALL hold one checklist of edge cases to test a story's acceptance criteria against, as a section of `ai/guidelines/product-backlog.md`, so that writing and reviewing stories use the same list. The checklist SHALL cover at least: empty and boundary input, invalid input, not found, not allowed, a repeated action, an action cancelled or undone part-way, partial failure, and data volume. Each item SHALL say when it does not apply (for example, "a read-only story has no repeated-action case"). The guidelines SHALL say how to classify a missing case: a case the story's Title and "I want" already imply SHALL be written as an acceptance criterion; a case that needs a decision, or that would add a capability, user group, permission or rule the story does not imply, SHALL be recorded as a Clarifications question and SHALL NOT be written as a criterion. The skills SHALL cite the checklist and SHALL NOT restate it.

#### Scenario: Implied case becomes a criterion
- **WHEN** a "Delete a saved filter" story has no criterion for a filter that no longer exists
- **THEN** the guidelines classify it as implied by the story, to be written as an acceptance criterion

#### Scenario: Decision case becomes a question
- **WHEN** a missing case would require choosing a retention period the story does not state
- **THEN** the guidelines classify it as a Clarifications question and not a criterion

#### Scenario: Not applicable
- **WHEN** a story only reads data and changes nothing
- **THEN** the repeated-action and partial-failure items are marked as not applying to it

#### Scenario: One list
- **WHEN** the checklist changes
- **THEN** it is changed in `ai/guidelines/product-backlog.md` only
