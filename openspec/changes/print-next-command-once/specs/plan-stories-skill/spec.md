## ADDED Requirements

### Requirement: Plan prints the apply command once at the end
When `jois-story-plan` has written, verified and frozen a slice, it SHALL end its final reply with one line, `/jois-code:apply slice <backlog>/<slice>` with the real names. It SHALL print that line once per run, and at no other time.

#### Scenario: Plan finishes
- **WHEN** a slice `sign-in` of the backlog `accounts` is written, verified and frozen
- **THEN** the last line of the final reply SHALL be `/jois-code:apply slice accounts/sign-in`

#### Scenario: Plan stops early
- **WHEN** the write is rejected, the read-back does not match, or a critical finding blocks the freeze
- **THEN** plan SHALL NOT print an apply command

#### Scenario: Reply after the run
- **WHEN** the user asks something else after plan has finished
- **THEN** the reply SHALL NOT print the apply command again
