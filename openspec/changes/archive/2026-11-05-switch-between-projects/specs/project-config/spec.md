# project-config Specification

## MODIFIED Requirements

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
