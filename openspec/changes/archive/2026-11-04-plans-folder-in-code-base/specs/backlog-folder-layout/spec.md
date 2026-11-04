# Spec Delta

## ADDED Requirements

### Requirement: The same layout inside a code base's .plans
The folder `.plans` of a code base SHALL hold the layout of this capability unchanged: one folder per backlog directly inside it, with the files and folders a backlog folder holds. No reader or writer SHALL treat it differently from any other data directory.

#### Scenario: Backlog in .plans
- **WHEN** a code base holds `.plans/iam/user-stories.csv`
- **THEN** `iam` is a backlog and its files are addressed by the same kinds as in any data directory

#### Scenario: Slices and context map
- **WHEN** a plan skill writes a slice for `iam` in that code base
- **THEN** it is written under `.plans/iam/slices/` as in any data directory
