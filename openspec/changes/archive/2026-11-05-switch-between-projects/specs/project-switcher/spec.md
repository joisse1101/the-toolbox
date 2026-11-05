# project-switcher Specification

## Purpose

Lets the user keep a list of projects in the project config and switch between them from a dropdown beside the backlog dropdown. A project is a folder of planner data, either a code base (data in its `.plans` folder) or a plain data folder.

## ADDED Requirements

### Requirement: Saved projects
The system SHALL keep a list of saved projects in the project config. Each entry SHALL hold one path, either `codeBase` or `dataDir`, and MAY hold a `name`. The entry whose path is the config's active `codeBase` or `dataDir` is the active project. A project without a name SHALL be shown by the last segment of its path.

#### Scenario: Entry with a name
- **WHEN** the list holds `{ name: Payments, codeBase: D:\code\payments }`
- **THEN** the project is shown as `Payments`

#### Scenario: Entry without a name
- **WHEN** the list holds `{ codeBase: D:\code\payments }`
- **THEN** the project is shown as `payments`

#### Scenario: Two keys in one entry
- **WHEN** an entry holds both `codeBase` and `dataDir`, or neither
- **THEN** loading the config fails and the error names the entry

### Requirement: Project dropdown
The portal SHALL show a Project dropdown to the left of the Backlog dropdown. Its first entry SHALL be Add Project, followed by the saved projects with the active one selected. A saved project whose folder no longer exists SHALL be shown disabled and SHALL NOT be switchable.

#### Scenario: Dropdown shown
- **WHEN** the portal loads with two saved projects
- **THEN** the dropdown holds Add Project, then the two projects, with the active one selected

#### Scenario: Folder missing
- **WHEN** a saved project's folder has been deleted
- **THEN** its entry is shown disabled and choosing it does nothing

### Requirement: Choosing a project changes the view only
The system SHALL, when the user chooses a saved project, save that project's path as the active one and reload, so the Backlog dropdown lists that project's backlogs. It SHALL NOT copy, move, create or delete any file. It SHALL wait for pending saves to finish first, and SHALL refuse while a write, create, rename, init, copy or migration is running.

#### Scenario: Switch to another project
- **WHEN** the user chooses `Payments` while `Billing` is active
- **THEN** the config's active path becomes the path of `Payments`, the portal reloads and the Backlog dropdown lists the backlogs of `Payments`

#### Scenario: No files change
- **WHEN** the user switches projects
- **THEN** no file in either project's folder is created, changed or removed

#### Scenario: Save still pending
- **WHEN** a backlog edit has not reached the disk yet
- **THEN** the switch waits until it has, and does not run if that save fails

#### Scenario: Write running
- **WHEN** the server is writing a backlog file
- **THEN** the switch is refused with a message to try again in a moment, and the active project is unchanged

### Requirement: Add a project by linking a code base
Add Project SHALL offer to link a code base. The user chooses the folder with the system folder dialog, and MAY give a name. The system SHALL check the folder's `.plans` folder as the Settings tab does for a code base: when it holds planner files the project is added and switched to without a prompt; when it does not, the portal SHALL offer to create `.plans` with its first backlog and acts only on the user's choice. The project SHALL NOT be added when the user declines or cancels.

#### Scenario: Code base with planner files
- **WHEN** the user links a code base whose `.plans` holds `iam/user-stories.csv`
- **THEN** the project is added to the list, becomes active and the portal shows backlog `iam`

#### Scenario: Code base without .plans
- **WHEN** the user links a code base with no `.plans` folder and accepts the offer to create it
- **THEN** `.plans` and its first backlog are created, the project is added and becomes active

#### Scenario: Offer declined
- **WHEN** the user declines the offer to create `.plans`
- **THEN** the list, the active project and the folder are unchanged

#### Scenario: Cancelled dialog
- **WHEN** the user closes the folder dialog without choosing
- **THEN** nothing is checked, saved or switched

#### Scenario: Already in the list
- **WHEN** the user links a code base that is already saved
- **THEN** no second entry is added and the portal switches to the existing one

### Requirement: Add a project by creating a new one
Add Project SHALL offer to create a new project from a name. The system SHALL create the folder `planner/data/<name>` holding the first backlog and the starting files that init creates, add it to the list as a `dataDir` entry with that name and make it active. The name SHALL follow the rules for a backlog name and SHALL NOT match an existing folder in `planner/data` or an existing project's name, ignoring case. A refused name creates nothing.

#### Scenario: New project
- **WHEN** the user creates the project `Billing`
- **THEN** `planner/data/Billing` exists with a first backlog, the list holds a `Billing` entry and it is active

#### Scenario: Name taken
- **WHEN** `planner/data/billing` already exists and the user creates `Billing`
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
- **THEN** the dropdown shows `data` for `planner/data` as the active project

### Requirement: Saving the list keeps the config intact
The system SHALL save the list through the same write as other config changes, keeping any comment in the file, and SHALL write nothing when validation refuses the result.

#### Scenario: Comments kept
- **WHEN** a project is added to a config that holds a comment
- **THEN** the comment is still in the file

#### Scenario: Validation refuses
- **WHEN** an added project would make the config invalid
- **THEN** the file is unchanged and the reason is shown
