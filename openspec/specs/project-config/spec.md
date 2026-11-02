# project-config Specification

## Purpose

Lets a planner project be named and pointed at its data directory from a visible YAML file and the portal, and prepares a directory with the structure the planner needs. It replaces the hidden `PLANNER_DATA_DIR` environment variable.

## Requirements

### Requirement: Project config file
The system SHALL read the project name and the data directory from a YAML file with two keys, `projectName` and `dataDir`. The file is `planner/planner.config.yaml` unless the `PLANNER_CONFIG` environment variable names another file.

#### Scenario: Config present
- **WHEN** the config holds `projectName: Payments` and `dataDir: D:\planner-data`
- **THEN** the project is named `Payments` and the data directory is `D:\planner-data`

#### Scenario: Relative data directory
- **WHEN** `dataDir` is a relative path
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: Alternative config file
- **WHEN** `PLANNER_CONFIG` names a file
- **THEN** that file is read instead of `planner/planner.config.yaml`

### Requirement: Safe defaults
The system SHALL fall back to a default for a missing file or a missing key, so a setup without a config keeps working. The default data directory is `planner/data` and the default project name is empty.

#### Scenario: No config file
- **WHEN** no config file exists
- **THEN** the data directory is `planner/data` and loading does not fail

#### Scenario: Key missing
- **WHEN** the config has `projectName` but no `dataDir`
- **THEN** the data directory is `planner/data`

### Requirement: Invalid config fails at load
The system SHALL validate the config when it loads. It SHALL fail naming the bad key for an unknown key, a value of the wrong type, or an empty `dataDir`, and for a file that is not valid YAML it SHALL fail naming the file.

#### Scenario: Unknown key
- **WHEN** the config contains `dataFolder: x`
- **THEN** loading fails and the error names `dataFolder`

#### Scenario: Wrong type
- **WHEN** `dataDir` is a number
- **THEN** loading fails and the error names `dataDir`

#### Scenario: Malformed YAML
- **WHEN** the file cannot be parsed
- **THEN** loading fails and the error names the file

### Requirement: The environment variable for the data folder is removed
The system SHALL NOT read `PLANNER_DATA_DIR` or `TLT_DATA_DIR`. The config file is the only source of the data directory.

#### Scenario: Old variable set
- **WHEN** `PLANNER_DATA_DIR` is set and the config names another folder
- **THEN** the config's folder is used and the variable is ignored

### Requirement: Every consumer uses the config
The portal server, the skill scripts, the Claude tool servers and the launchers SHALL take the data directory from the same config, through one shared resolution.

#### Scenario: Config changed, script run
- **WHEN** the config's `dataDir` is changed and a skill script is started afterwards
- **THEN** the script reads and writes in the new directory

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

### Requirement: Settings tab
The portal SHALL have a Settings tab that shows the project name, the data directory and where the config file is, lets the user change the name and the directory, and runs init.

#### Scenario: View
- **WHEN** the user opens the Settings tab
- **THEN** it shows the project name, the data directory and the config file path

#### Scenario: Change and save
- **WHEN** the user chooses a valid new data directory with the folder picker
- **THEN** the config file holds the new value and the portal reloads from the new directory

#### Scenario: The data directory box is read-only
- **WHEN** the user opens the Settings tab
- **THEN** the data directory box shows the current directory and cannot be typed in

#### Scenario: Folder picker
- **WHEN** the user presses Change folder
- **THEN** the server opens the system's folder dialog and the chosen folder goes through the same check, offer and switch as any new directory

#### Scenario: Picker cancelled
- **WHEN** the user closes the folder dialog without choosing
- **THEN** nothing is checked, saved or switched

#### Scenario: Picker unavailable
- **WHEN** the server cannot open the folder dialog
- **THEN** the tab shows the reason and the data directory is unchanged

#### Scenario: Run init from the tab
- **WHEN** the user runs init
- **THEN** the tab shows the folders created and the folders that already existed

#### Scenario: Invalid value
- **WHEN** the user saves a value the server refuses
- **THEN** the tab shows the reason and the config file is unchanged

#### Scenario: Skill sessions
- **WHEN** the data directory has been changed
- **THEN** the tab states that skill scripts and open Claude sessions use the new directory only after they are started again

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

### Requirement: The server confines a directory sent by the browser
The server SHALL accept a data directory from the browser only as an absolute path. It SHALL resolve links before checking, and SHALL refuse a system folder, a drive root, a path that is a file, and any path inside the repository other than `planner/data`. It SHALL NOT create a folder except through init or the copy.

#### Scenario: Relative path
- **WHEN** the browser sends `..\elsewhere`
- **THEN** the server refuses it and the config is unchanged

#### Scenario: Protected location
- **WHEN** the browser sends `C:\Windows` or a drive root
- **THEN** the server refuses it and names the reason

#### Scenario: Link into a protected folder
- **WHEN** the path is a junction that leads into the repository's `planner/logic`
- **THEN** the server refuses it

#### Scenario: Missing folder saved directly
- **WHEN** the path does not exist and the config is saved with it without the copy or init
- **THEN** the save is refused and the reply says the folder must be created by init or the copy first

### Requirement: Tests never use the real data
The test suite SHALL point `PLANNER_CONFIG` at a committed test config whose `dataDir` is the sample data folder, and a test SHALL fail if that setup is missing.

#### Scenario: Suite run
- **WHEN** `npm test` runs
- **THEN** every test reads the sample data folder and none reads the real data directory

#### Scenario: Setup dropped
- **WHEN** the test setup no longer sets `PLANNER_CONFIG`
- **THEN** the guard test fails
