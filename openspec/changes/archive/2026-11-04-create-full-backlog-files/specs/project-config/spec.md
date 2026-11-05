## MODIFIED Requirements

### Requirement: Init creates the folder structure
The system SHALL, on request, create the data directory when it is missing, and SHALL create a first backlog in it, named `new-backlog` and holding the starting files of the `backlog-folder-layout` capability, when the directory holds no backlog. It SHALL NOT create a backlog when the directory already holds one. It SHALL NOT overwrite, modify or delete any existing file or folder. The reply SHALL list what was created and what already existed.

#### Scenario: Empty directory
- **WHEN** init runs on a directory that does not exist or is empty
- **THEN** the directory and `new-backlog` with its starting files exist afterwards, and all are listed as created

#### Scenario: Partly prepared directory
- **WHEN** init runs on a directory that already holds `iam/user-stories.csv`
- **THEN** `iam` is untouched and listed as existing, and nothing is created

#### Scenario: Init twice
- **WHEN** init runs a second time
- **THEN** nothing is created and the directory and its backlog are listed as existing

#### Scenario: Skills work afterwards
- **WHEN** init has run and a story skill reads the data folder
- **THEN** it finds the backlog and reads every starting file without an error

### Requirement: Init creates the .plans folder in a code base
The system SHALL, on request, create the `.plans` folder in a chosen code base when it is missing, and SHALL create a first backlog in it by the same rule as init of a data directory. It SHALL NOT create the code base, and SHALL NOT overwrite, modify or delete any existing file or folder. The reply SHALL list what was created and what already existed.

#### Scenario: Code base without .plans
- **WHEN** init runs for a code base that has no `.plans` folder
- **THEN** `.plans` and `.plans/new-backlog` with its starting files are created and listed as created

#### Scenario: Init twice
- **WHEN** init runs again
- **THEN** nothing is created and `.plans` and its backlog are listed as existing

#### Scenario: Code base missing
- **WHEN** the chosen code base folder does not exist
- **THEN** init is refused and nothing is created
