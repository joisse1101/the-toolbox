# Spec Delta

## MODIFIED Requirements

### Requirement: Init creates the folder structure
The system SHALL, on request, create the data directory when it is missing. It SHALL NOT create backlog folders: each is created with its backlog. It SHALL NOT overwrite, modify or delete any existing file or folder. The reply SHALL list what was created and what already existed.

#### Scenario: Empty directory
- **WHEN** init runs on a directory that does not exist or is empty
- **THEN** the directory exists afterwards, is listed as created when it was missing, and nothing else is created

#### Scenario: Partly prepared directory
- **WHEN** init runs on a directory that already holds `iam/user-stories.csv`
- **THEN** `iam` is untouched and listed as existing, and nothing is created

#### Scenario: Init twice
- **WHEN** init runs a second time
- **THEN** nothing is created and the directory is listed as existing

### Requirement: Copy existing data into a new folder
The system SHALL, on request, copy the files of the current data directory into another directory, keeping the folder layout and skipping any `backups/` folder. It SHALL NOT overwrite a file that already exists there, SHALL NOT change or remove anything in the source, and SHALL reply with the files copied and the files skipped.

#### Scenario: Copy into an empty folder
- **WHEN** the current directory holds backlog folders and the target is empty
- **THEN** all of them are copied to the same relative paths and the source is unchanged

#### Scenario: Target already holds a file
- **WHEN** the target already has `iam/user-stories.csv`
- **THEN** that file keeps its contents, is listed as skipped, and the rest are copied

#### Scenario: Source and target are the same
- **WHEN** the target is the current data directory, or lies inside it, or contains it
- **THEN** the request is refused and nothing is copied

#### Scenario: Old backups are not copied
- **WHEN** a backlog folder holds a `backups/` folder from an earlier version
- **THEN** it is not copied and is not listed as skipped
