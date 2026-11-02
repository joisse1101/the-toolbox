## MODIFIED Requirements

### Requirement: Init creates the folder structure
The system SHALL, on request, create the data directory when it is missing, and a `logs` folder in it. It SHALL NOT create backlog folders: each is created with its backlog. It SHALL NOT overwrite, modify or delete any existing file or folder. The reply SHALL list what was created and what already existed.

#### Scenario: Empty directory
- **WHEN** init runs on an empty directory
- **THEN** `logs` is created and listed as created

#### Scenario: Partly prepared directory
- **WHEN** init runs on a directory that already holds `iam/user-stories.csv`
- **THEN** `iam` is untouched, `logs` is created if missing, and existing entries are listed as existing

#### Scenario: Init twice
- **WHEN** init runs a second time
- **THEN** nothing is created and `logs` is listed as existing

### Requirement: Offer to migrate into a folder without planner files
The system SHALL, when the user chooses a new data directory and before the config is saved, check whether it holds any backlog folder (a subfolder with `user-stories.csv`) or any folder of the older layout. When it holds none, or does not exist, the portal SHALL offer to copy the current data there, or to run init instead, and SHALL act only on the user's choice. The config is saved once the folder is ready. When the folder already holds a backlog folder, the portal SHALL switch to it without asking. When it holds only the older layout, the portal SHALL switch to it and offer the migration of the `backlog-folder-layout` capability.

#### Scenario: Empty target, user accepts the copy
- **WHEN** the chosen directory has no planner files and the user chooses to copy
- **THEN** the current data is copied there, the config is saved and the portal shows the new data

#### Scenario: Empty target, user chooses init
- **WHEN** the user chooses init instead
- **THEN** the folder is prepared, the config is saved and nothing is copied

#### Scenario: Missing target
- **WHEN** the chosen directory does not exist and the user chooses the copy or init
- **THEN** the directory is created as part of that action before the config is saved

#### Scenario: Target already has planner files
- **WHEN** the new directory already holds `iam/user-stories.csv`
- **THEN** the portal switches to it with no prompt and no copy

#### Scenario: Target holds the older layout
- **WHEN** the new directory holds `backlogs/iam.csv` and no backlog folder
- **THEN** the portal switches to it, lists no backlog and offers to migrate

### Requirement: Copy existing data into a new folder
The system SHALL, on request, copy the files of the current data directory into another directory, keeping the folder layout and skipping any `backups/` folder. It SHALL NOT overwrite a file that already exists there, SHALL NOT change or remove anything in the source, and SHALL reply with the files copied and the files skipped.

#### Scenario: Copy into an empty folder
- **WHEN** the current directory holds backlog folders and `logs` and the target is empty
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

