# Spec Delta

## ADDED Requirements

### Requirement: A story skill finds the data folder in the current folder
A story skill SHALL find the backlog data folder in this order: the file the `PLANNER_CONFIG` variable names, then a `.plans` folder in the current folder, then a `planner.config.yaml` in the current folder. It SHALL NOT look in any parent folder. It SHALL read the `codeBase` and `dataDir` keys only and resolve a relative value against the config file's folder.

#### Scenario: Variable wins
- **WHEN** `PLANNER_CONFIG` names a config file and the current folder also has a `.plans` folder
- **THEN** the folder the variable's file names is used

#### Scenario: .plans in the current folder
- **WHEN** no variable is set and the current folder holds `.plans`
- **THEN** that `.plans` is the data folder

#### Scenario: Config in the current folder
- **WHEN** no variable is set, there is no `.plans`, and the current folder holds `planner.config.yaml` with `codeBase`
- **THEN** that code base's `.plans` is the data folder

#### Scenario: Started in a sub-folder
- **WHEN** the session starts in a sub-folder of a code base and the code base's `.plans` is in the parent
- **THEN** the skill does not examine the parent and reports that no data folder was found

#### Scenario: Unreadable config
- **WHEN** the config file names both `codeBase` and `dataDir`, names neither, or is not a flat `key: value` file
- **THEN** the skill reports the file and the problem and does not guess a folder

#### Scenario: .plans is a file
- **WHEN** the current folder holds a file named `.plans`
- **THEN** the skill reports it and does not guess a folder

### Requirement: A skill asks before creating .plans
When no data folder is found, a story skill SHALL say that none was found in the current folder and SHALL write nothing until the user answers. `jois-story-propose`, `jois-story-review` and `jois-story-plan` SHALL offer to create `.plans` in the current folder and create it only on a yes. `jois-story-explore` SHALL only report it.

#### Scenario: User agrees
- **WHEN** no data folder is found and the user says yes to creating it
- **THEN** a `.plans` folder is created in the current folder and nothing else is created

#### Scenario: User declines
- **WHEN** the user says no
- **THEN** nothing is created or written

#### Scenario: Explore finds nothing
- **WHEN** `jois-story-explore` finds no data folder
- **THEN** it reports that and creates nothing

## REMOVED Requirements

### Requirement: The data folder is found without the planner
**Reason**: Replaced by "A story skill finds the data folder in the current folder": the lookup no longer climbs to a parent folder and now finds `.plans` first.
**Migration**: Start the skill in the code base folder. A setup that relied on a parent folder's `planner.config.yaml` sets `PLANNER_CONFIG` or runs the skill in the folder that holds the config.
