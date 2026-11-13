# Spec Delta

## ADDED Requirements

### Requirement: A story skill uses only .plans in the current folder
A story skill SHALL use the `.plans` folder in the current folder as the backlog data folder, and SHALL look nowhere else. It SHALL NOT look in any parent folder, SHALL NOT read the `PLANNER_CONFIG` variable and SHALL NOT read a `planner.config.yaml` file. When it finds no data folder, its message SHALL name only `.plans` in the current folder.

#### Scenario: .plans in the current folder
- **WHEN** the current folder holds `.plans`
- **THEN** that `.plans` is the data folder

#### Scenario: The variable is ignored
- **WHEN** `PLANNER_CONFIG` names a config file and the current folder also has a `.plans` folder
- **THEN** the current folder's `.plans` is used and the variable's file is not read

#### Scenario: The variable alone finds nothing
- **WHEN** `PLANNER_CONFIG` names a valid config file and the current folder has no `.plans`
- **THEN** the skill reports that no data folder was found in the current folder

#### Scenario: A config file alone finds nothing
- **WHEN** the current folder holds `planner.config.yaml` with `codeBase` or `dataDir` and no `.plans`
- **THEN** the skill reports that no data folder was found in the current folder and does not read the config file

#### Scenario: Started in a sub-folder
- **WHEN** the session starts in a sub-folder of a code base and the code base's `.plans` is in the parent
- **THEN** the skill does not examine the parent and reports that no data folder was found

#### Scenario: The message names only .plans
- **WHEN** no data folder is found
- **THEN** the message names the current folder and `.plans`, and does not mention `PLANNER_CONFIG` or `planner.config.yaml`

#### Scenario: .plans is a file
- **WHEN** the current folder holds a file named `.plans`
- **THEN** the skill reports it and does not guess a folder

## REMOVED Requirements

### Requirement: A story skill finds the data folder in the current folder
**Reason**: The `PLANNER_CONFIG` variable and the `planner.config.yaml` lookup tie the skills to the planner's config file. A skill now works only on the `.plans` backlog of the folder it runs in, as "A story skill uses only .plans in the current folder" states.
**Migration**: Start the session in the code base that holds `.plans`. Move a backlog kept in a plain data folder, such as `planner/data/<backlog>`, into that code base's `.plans/<backlog>`.
