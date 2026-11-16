# Spec Delta

## MODIFIED Requirements

### Requirement: Project config file
The system SHALL read the project name, the active code base or data directory, and an optional list of saved projects from a YAML file with four keys, `projectName`, `codeBase`, `dataDir` and `projects`. The file is `viewer/viewer.config.yaml` unless the `VIEWER_CONFIG` environment variable names another file. Each `projects` entry holds one path, `codeBase` or `dataDir`, and an optional `name`; its capability is `project-switcher`.

#### Scenario: Config present
- **WHEN** the config holds `projectName: Payments` and `dataDir: D:\planner-data`
- **THEN** the project is named `Payments` and the data directory is `D:\planner-data`

#### Scenario: Relative data directory
- **WHEN** `dataDir` is a relative path
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: Alternative config file
- **WHEN** `VIEWER_CONFIG` names a file
- **THEN** that file is read instead of `viewer/viewer.config.yaml`

#### Scenario: The old variable is not read
- **WHEN** `PLANNER_CONFIG` names a file and `VIEWER_CONFIG` is not set
- **THEN** `viewer/viewer.config.yaml` is read and the named file is not

#### Scenario: Code base present
- **WHEN** the config holds `codeBase: D:\code\payments`
- **THEN** the data directory is `D:\code\payments\.plans`

#### Scenario: Relative code base
- **WHEN** `codeBase` is a relative path
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: Relative path in a saved project
- **WHEN** a `projects` entry holds a relative `codeBase` or `dataDir`
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: No list
- **WHEN** the config has no `projects` key
- **THEN** it loads as before and the list is empty

### Requirement: Safe defaults
The system SHALL fall back to a default for a missing file or a missing key, so a setup without a config keeps working. The default data directory is `viewer/data` and the default project name is empty.

#### Scenario: No config file
- **WHEN** no config file exists
- **THEN** the data directory is `viewer/data` and loading does not fail

#### Scenario: Key missing
- **WHEN** the config has `projectName` but no `dataDir`
- **THEN** the data directory is `viewer/data`

### Requirement: Every consumer uses the config
The viewer's server SHALL take the data directory from the project config through the viewer's own resolution. The story skills SHALL NOT read the project config; they use only the `.plans` folder of the folder they run in, as the `toolkit-story-skills` capability describes. A story skill's script SHALL NOT import the viewer's resolution.

#### Scenario: Config changed, script run
- **WHEN** the config's `dataDir` is changed and a skill script is started afterwards from a folder that holds `.plans`
- **THEN** the script reads and writes in that `.plans` folder, not in the config's directory

### Requirement: The server confines a directory sent by the browser
The server SHALL accept a data directory from the browser only as an absolute path. It SHALL resolve links before checking, and SHALL refuse a system folder, a drive root, a path that is a file, and any path inside the repository other than `viewer/data`. It SHALL NOT create a folder except through init or the copy.

#### Scenario: Relative path
- **WHEN** the browser sends `..\elsewhere`
- **THEN** the server refuses it and the config is unchanged

#### Scenario: Protected location
- **WHEN** the browser sends `C:\Windows` or a drive root
- **THEN** the server refuses it and names the reason

#### Scenario: Link into a protected folder
- **WHEN** the path is a junction that leads into the repository's `viewer/shared`
- **THEN** the server refuses it

#### Scenario: Missing folder saved directly
- **WHEN** the path does not exist and the config is saved with it without the copy or init
- **THEN** the save is refused and the reply says the folder must be created by init or the copy first

### Requirement: Tests never use the real data
The test suite SHALL point `VIEWER_CONFIG` at a committed test config whose `dataDir` is the sample data folder, and a test SHALL fail if that setup is missing.

#### Scenario: Suite run
- **WHEN** `npm test` runs
- **THEN** every test reads the sample data folder and none reads the real data directory

#### Scenario: Setup dropped
- **WHEN** the test setup no longer sets `VIEWER_CONFIG`
- **THEN** the guard test fails

### Requirement: Existing setups keep working
A config with `dataDir`, and a setup with no config, SHALL behave as before this change, so no setup has to change unless its user chooses to.

#### Scenario: Data directory config
- **WHEN** the config holds `dataDir: D:\planner-data` and no `codeBase`
- **THEN** the portal serves `D:\planner-data` and nothing is moved

#### Scenario: No config
- **WHEN** no config file exists
- **THEN** the portal serves `viewer/data`
