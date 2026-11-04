# Spec Delta

## MODIFIED Requirements

### Requirement: Writes go only through the bundled writers
A story skill SHALL write to the data only by running its bundled writer script with Bash. Each writer SHALL keep its validation, all-or-nothing write and read-back, and SHALL accept `--check` to validate and report without writing. A writer SHALL refuse a target outside the data folder.

#### Scenario: Check writes nothing
- **WHEN** a writer is run with `--check` on a valid draft
- **THEN** it reports what it would write and no file changes

#### Scenario: Invalid draft writes nothing
- **WHEN** a writer is run on a draft with one invalid item
- **THEN** it names the item and writes nothing

#### Scenario: Target outside the data folder
- **WHEN** a writer is given a backlog name that resolves outside the data folder
- **THEN** it refuses and writes nothing
