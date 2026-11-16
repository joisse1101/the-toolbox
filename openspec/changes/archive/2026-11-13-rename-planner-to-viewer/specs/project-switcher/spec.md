# Spec Delta

## MODIFIED Requirements

### Requirement: Add a project by creating a new one
Add Project SHALL offer to create a new project from a name. The system SHALL create the folder `viewer/data/<name>` holding the first backlog and the starting files that init creates, add it to the list as a `dataDir` entry with that name and make it active. The name SHALL follow the rules for a backlog name and SHALL NOT match an existing folder in `viewer/data` or an existing project's name, ignoring case. A refused name creates nothing.

#### Scenario: New project
- **WHEN** the user creates the project `Billing`
- **THEN** `viewer/data/Billing` exists with a first backlog, the list holds a `Billing` entry and it is active

#### Scenario: Name taken
- **WHEN** `viewer/data/billing` already exists and the user creates `Billing`
- **THEN** the request is refused, the reason is shown and nothing is created

#### Scenario: Invalid name
- **WHEN** the name contains a path separator
- **THEN** the request is refused and nothing is created

### Requirement: A config without a list still works
The system SHALL show the config's active `codeBase` or `dataDir` as a project when the config has no `projects` list or the list does not hold it. It SHALL write that active project into the list the first time a project is added or switched to, and SHALL NOT change the config file otherwise.

#### Scenario: Legacy config
- **WHEN** the config holds only `dataDir: D:\planner-data`
- **THEN** the dropdown shows one project, `planner-data`, selected, and the config file is unchanged

#### Scenario: First project added
- **WHEN** the user adds a second project to that config
- **THEN** the list holds `planner-data` and the new project, and the new project is active

#### Scenario: No config
- **WHEN** no config file exists
- **THEN** the dropdown shows `data` for `viewer/data` as the active project
