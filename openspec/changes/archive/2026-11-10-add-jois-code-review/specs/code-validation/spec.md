# Spec Delta

## ADDED Requirements

### Requirement: Validate can be started by the review command
`/jois-code:validate` SHALL be startable by `/jois-code:review`, and SHALL apply every rule it has when started that way. The review command SHALL NOT answer a question that validate puts to the user, including the confirmation before it runs a PR that is not the user's own.

#### Scenario: Someone else's PR through review
- **WHEN** the review command starts validate for a PR whose author is not the user
- **THEN** validate asks the user for a yes, with the statement that a checkout is not a sandbox, and runs nothing before it

#### Scenario: Same result as a direct run
- **WHEN** the review command starts validate for a slice or a PR
- **THEN** validate writes the same result file, or no file, as a direct run of the same form
