# Spec Delta

## MODIFIED Requirements

### Requirement: Project config file
The system SHALL read the project name and either a code base or a data directory from a YAML file with three keys, `projectName`, `codeBase` and `dataDir`. The file is `planner/planner.config.yaml` unless the `PLANNER_CONFIG` environment variable names another file.

#### Scenario: Config present
- **WHEN** the config holds `projectName: Payments` and `dataDir: D:\planner-data`
- **THEN** the project is named `Payments` and the data directory is `D:\planner-data`

#### Scenario: Relative data directory
- **WHEN** `dataDir` is a relative path
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: Alternative config file
- **WHEN** `PLANNER_CONFIG` names a file
- **THEN** that file is read instead of `planner/planner.config.yaml`

#### Scenario: Code base present
- **WHEN** the config holds `codeBase: D:\code\payments`
- **THEN** the data directory is `D:\code\payments\.plans`

#### Scenario: Relative code base
- **WHEN** `codeBase` is a relative path
- **THEN** it is resolved against the folder that holds the config file

### Requirement: Invalid config fails at load
The system SHALL validate the config when it loads. It SHALL fail naming the bad key for an unknown key, a value of the wrong type, an empty `dataDir` or an empty `codeBase`, and for a config that sets both `codeBase` and `dataDir`. For a file that is not valid YAML it SHALL fail naming the file.

#### Scenario: Unknown key
- **WHEN** the config contains `dataFolder: x`
- **THEN** loading fails and the error names `dataFolder`

#### Scenario: Wrong type
- **WHEN** `dataDir` is a number
- **THEN** loading fails and the error names `dataDir`

#### Scenario: Malformed YAML
- **WHEN** the file cannot be parsed
- **THEN** loading fails and the error names the file

#### Scenario: Both folder keys
- **WHEN** the config holds both `codeBase` and `dataDir`
- **THEN** loading fails and the error names both keys

#### Scenario: Empty code base
- **WHEN** `codeBase` is empty
- **THEN** loading fails and the error names `codeBase`

### Requirement: Every consumer uses the config
The portal server SHALL take the data directory from the project config through the planner's own resolution. The story skills SHALL take the same directory from the same config, found as the `toolkit-story-skills` capability describes, reading the `codeBase` and `dataDir` keys only. A story skill's script SHALL NOT import the planner's resolution.

#### Scenario: Config changed, script run
- **WHEN** the config's `dataDir` is changed and a skill script is started afterwards
- **THEN** the script reads and writes in the new directory

## ADDED Requirements

### Requirement: A code base keeps its artifacts in .plans
When the config names a code base, the data directory SHALL be the folder `.plans` directly inside it. That folder SHALL hold what a data directory holds, so the portal reads and writes it like any data directory.

#### Scenario: Portal serves the code base
- **WHEN** the config's `codeBase` is `D:\code\payments` and `D:\code\payments\.plans\iam\user-stories.csv` exists
- **THEN** the portal lists backlog `iam`

#### Scenario: No .plans folder yet
- **WHEN** the code base has no `.plans` folder
- **THEN** the portal lists no backlog and the Settings tab offers to create it

### Requirement: Existing setups keep working
A config with `dataDir`, and a setup with no config, SHALL behave as before this change, so no setup has to change unless its user chooses to.

#### Scenario: Data directory config
- **WHEN** the config holds `dataDir: D:\planner-data` and no `codeBase`
- **THEN** the portal serves `D:\planner-data` and nothing is moved

#### Scenario: No config
- **WHEN** no config file exists
- **THEN** the portal serves `planner/data`

### Requirement: Init creates the .plans folder in a code base
The system SHALL, on request, create the `.plans` folder in a chosen code base when it is missing. It SHALL NOT create the code base, SHALL NOT create backlog folders, and SHALL NOT overwrite, modify or delete any existing file or folder. The reply SHALL list what was created and what already existed.

#### Scenario: Code base without .plans
- **WHEN** init runs for a code base that has no `.plans` folder
- **THEN** `.plans` is created and listed as created

#### Scenario: Init twice
- **WHEN** init runs again
- **THEN** nothing is created and `.plans` is listed as existing

#### Scenario: Code base missing
- **WHEN** the chosen code base folder does not exist
- **THEN** init is refused and nothing is created

### Requirement: The Settings tab chooses a code base
The Settings tab SHALL show the code base when the config names one, and SHALL let the user choose one with the system folder dialog. A chosen code base SHALL go through the same check, offer and switch as a new data directory, applied to its `.plans` folder. Saving it SHALL write `codeBase` to the config and remove `dataDir`.

#### Scenario: Choose a code base with planner files
- **WHEN** the user chooses a code base whose `.plans` holds `iam/user-stories.csv`
- **THEN** the portal switches to it with no prompt and the config holds `codeBase` and no `dataDir`

#### Scenario: Choose a code base without .plans
- **WHEN** the user chooses a code base that has no `.plans` folder
- **THEN** the tab offers to create it, or to copy the current data into it, and acts only on the user's choice

#### Scenario: Cancelled
- **WHEN** the user closes the folder dialog without choosing
- **THEN** nothing is checked, saved or switched

### Requirement: Offer to move a data directory into a code base
When the config uses `dataDir` or no config exists, the Settings tab SHALL offer to move the data into a code base. On the user's choice it SHALL copy the current data into the code base's `.plans` without overwriting a file, and then save `codeBase`. Declining SHALL change nothing.

#### Scenario: User accepts the move
- **WHEN** the user chooses a code base and accepts the copy
- **THEN** the data is copied to `<code base>\.plans`, existing files there are listed as skipped, and the config then holds `codeBase`

#### Scenario: User declines
- **WHEN** the user declines the offer
- **THEN** the config and both folders are unchanged

#### Scenario: Source data left in place
- **WHEN** the move has finished
- **THEN** the old data directory still holds its files

### Requirement: The server confines a code base
The server SHALL accept a code base from the browser only as an absolute path to an existing folder. It SHALL resolve links before checking and SHALL refuse a system folder, a drive root, the home folder itself, a path that is a file, any path inside the repository, and a code base whose `.plans` is a file. It SHALL NOT create the code base.

#### Scenario: Relative path
- **WHEN** the browser sends `..\elsewhere` as the code base
- **THEN** the server refuses it and the config is unchanged

#### Scenario: Inside the repository
- **WHEN** the browser sends a folder inside the planner's own repository
- **THEN** the server refuses it and names the reason

#### Scenario: Missing code base
- **WHEN** the browser sends a folder that does not exist
- **THEN** the server refuses it and creates nothing

#### Scenario: .plans is a file
- **WHEN** the code base holds a file named `.plans`
- **THEN** the server refuses it and says so
