# project-config Specification

## Purpose

Lets a planner project be named and pointed at its data directory from a visible YAML file and the portal, and prepares a directory with the structure the planner needs. It replaces the hidden `PLANNER_DATA_DIR` environment variable.

## Requirements

### Requirement: Project config file
The system SHALL read the project name, the active code base or data directory, and an optional list of saved projects from a YAML file with four keys, `projectName`, `codeBase`, `dataDir` and `projects`. The file is `planner/planner.config.yaml` unless the `PLANNER_CONFIG` environment variable names another file. Each `projects` entry holds one path, `codeBase` or `dataDir`, and an optional `name`; its capability is `project-switcher`.

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

#### Scenario: Relative path in a saved project
- **WHEN** a `projects` entry holds a relative `codeBase` or `dataDir`
- **THEN** it is resolved against the folder that holds the config file

#### Scenario: No list
- **WHEN** the config has no `projects` key
- **THEN** it loads as before and the list is empty

### Requirement: Safe defaults
The system SHALL fall back to a default for a missing file or a missing key, so a setup without a config keeps working. The default data directory is `planner/data` and the default project name is empty.

#### Scenario: No config file
- **WHEN** no config file exists
- **THEN** the data directory is `planner/data` and loading does not fail

#### Scenario: Key missing
- **WHEN** the config has `projectName` but no `dataDir`
- **THEN** the data directory is `planner/data`

### Requirement: Invalid config fails at load
The system SHALL validate the config when it loads. It SHALL fail naming the bad key for an unknown key, a value of the wrong type, an empty `dataDir` or an empty `codeBase`, and for a config that sets both `codeBase` and `dataDir`. It SHALL fail naming the entry for a `projects` value that is not a list, an entry that is not an object, an entry with an unknown key, an entry with both or neither of `codeBase` and `dataDir`, an empty path, or a `name` that is not text. For a file that is not valid YAML it SHALL fail naming the file.

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

#### Scenario: Projects not a list
- **WHEN** `projects` holds text
- **THEN** loading fails and the error names `projects`

#### Scenario: Bad project entry
- **WHEN** a `projects` entry holds both `codeBase` and `dataDir`
- **THEN** loading fails and the error names `projects` and the entry's position

### Requirement: The environment variable for the data folder is removed
The system SHALL NOT read `PLANNER_DATA_DIR` or `TLT_DATA_DIR`. The config file is the only source of the data directory.

#### Scenario: Old variable set
- **WHEN** `PLANNER_DATA_DIR` is set and the config names another folder
- **THEN** the config's folder is used and the variable is ignored

### Requirement: Every consumer uses the config
The portal server SHALL take the data directory from the project config through the planner's own resolution. The story skills SHALL take the same directory from the same config, found as the `toolkit-story-skills` capability describes, reading the `codeBase` and `dataDir` keys only. A story skill's script SHALL NOT import the planner's resolution.

#### Scenario: Config changed, script run
- **WHEN** the config's `dataDir` is changed and a skill script is started afterwards
- **THEN** the script reads and writes in the new directory

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

### Requirement: Copy existing data into a new folder
The system SHALL, on request, copy the files of the current data directory into another directory, keeping the folder layout and skipping any `backups/` folder. By default it SHALL NOT overwrite a file that already exists there. It SHALL replace such a file only when the request asks for overwrite, and then only the files that exist in both places; it SHALL NOT remove any other file in the target. It SHALL NOT change or remove anything in the source, and SHALL reply with the files copied, the files overwritten and the files skipped.

#### Scenario: Copy into an empty folder
- **WHEN** the current directory holds backlog folders and the target is empty
- **THEN** all of them are copied to the same relative paths and the source is unchanged

#### Scenario: Target already holds a file
- **WHEN** the target already has `iam/user-stories.csv` and the request does not ask for overwrite
- **THEN** that file keeps its contents, is listed as skipped, and the rest are copied

#### Scenario: Overwrite requested
- **WHEN** the target already has `iam/user-stories.csv` and the request asks for overwrite
- **THEN** that file takes the source's contents, is listed as overwritten, and a file in the target that the source lacks is left as it was

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
The system SHALL, when the user changes the folder of the current project in the Settings tab, relocate that project's backlogs. Before anything is copied or saved it SHALL check whether the new folder holds any backlog folder (a subfolder with `user-stories.csv`) or any folder of the older layout. When it holds none, or does not exist, the system SHALL create the folder if needed, copy the current data into it without asking, and save the new path in place of the project's old one once the copy has been read back successfully. When it holds a backlog folder, the system SHALL stop and list the files an overwrite would replace, and SHALL act only on the user's choice: overwrite those files with the current data, switch to the files already there and copy nothing, or cancel. When it holds only the older layout, the portal SHALL switch to it and offer the migration of the `backlog-folder-layout` capability. The old folder SHALL keep all its files in every case. The project's entry in the saved list SHALL change path, and no second entry SHALL be added.

#### Scenario: Empty target, user accepts the copy
- **WHEN** the chosen directory has no planner files
- **THEN** the current data is copied there without a prompt, the saved path is replaced and the portal shows the copied data

#### Scenario: Empty target, user chooses init
- **WHEN** the chosen directory has no planner files
- **THEN** the relocation does not offer init and always copies; a project that starts empty is made with Add Project or with Run init on the Settings tab

#### Scenario: Missing target
- **WHEN** the chosen directory does not exist
- **THEN** it is created as part of the relocation before the copy

#### Scenario: Target already has planner files
- **WHEN** the new directory already holds `iam/user-stories.csv`
- **THEN** nothing is copied or saved until the user chooses, and the prompt names the files an overwrite would replace

#### Scenario: Overwrite chosen
- **WHEN** the user chooses overwrite
- **THEN** the same-named files take the current data, other files in the target are untouched, and the saved path is replaced

#### Scenario: Just switch chosen
- **WHEN** the user chooses to switch
- **THEN** nothing is copied, the saved path is replaced and the portal shows the files already there

#### Scenario: Cancel chosen
- **WHEN** the user cancels
- **THEN** nothing is copied, the saved path is unchanged and the old folder is untouched

#### Scenario: Copy fails
- **WHEN** a file cannot be copied or does not read back the same
- **THEN** the saved path is unchanged, the reason is shown and the old folder is untouched

#### Scenario: Old folder kept
- **WHEN** any relocation finishes
- **THEN** every file in the old folder is still there

#### Scenario: Entry updated, not added
- **WHEN** the relocated project was in the saved list
- **THEN** the list still holds one entry for it, with the new path

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

### Requirement: The Settings tab chooses a code base
The Settings tab SHALL show the code base when the config names one, and SHALL let the user choose one with the system folder dialog. A chosen code base SHALL go through the same relocation as a new data directory, applied to its `.plans` folder. Saving it SHALL write `codeBase` to the config and remove `dataDir`, and SHALL replace the current project's entry in the saved list.

#### Scenario: Choose a code base with planner files
- **WHEN** the user chooses a code base whose `.plans` holds `iam/user-stories.csv`
- **THEN** the portal asks the user to overwrite, switch or cancel, and nothing is saved until they choose

#### Scenario: Choose a code base without .plans
- **WHEN** the user chooses a code base that has no `.plans` folder
- **THEN** `.plans` is created, the current data is copied into it without a prompt and the config holds `codeBase` and no `dataDir`

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
