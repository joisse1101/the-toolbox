## Purpose

Gives browser-based tools safe read and write access to CSV files in a single designated data folder on the local machine, so tools can persist their data as plain CSV without direct disk access.

## Requirements

### Requirement: Access is limited to a registered data folder
The system SHALL expose file operations only for the CSV files of a backlog folder directly inside the data folder, under the fixed file names of the `backlog-folder-layout` capability. It SHALL NOT read, write, rename or list anything else.

#### Scenario: Path traversal is rejected
- **WHEN** a request names a backlog such as `../secret` or `a/b`
- **THEN** the system rejects the request with an error and touches no file

#### Scenario: Non-CSV files are ignored
- **WHEN** a backlog folder holds `notes.txt` and `user-stories.csv`
- **THEN** only `user-stories.csv` can be reached

### Requirement: Local-only service
The system SHALL accept connections only from the local machine.

#### Scenario: Remote connection
- **WHEN** another machine on the network attempts to reach the service
- **THEN** the connection is refused

### Requirement: List files
The system SHALL list the backlogs, meaning the subfolders of the data folder that hold `user-stories.csv`, sorted by name, each by its folder name.

#### Scenario: Folder with files
- **WHEN** the data folder holds `b/user-stories.csv` and `a/user-stories.csv`
- **THEN** the list returns `a` then `b`

#### Scenario: Empty folder
- **WHEN** the data folder holds no backlog folder
- **THEN** the list is empty and no error is raised

### Requirement: Read and write file contents
The system SHALL return the full text of a named CSV file and SHALL replace the full contents of a named CSV file on write. Text SHALL be UTF-8; a leading byte-order mark SHALL be preserved on write if present on read, and be added for new files so Excel opens them correctly.

#### Scenario: Read existing file
- **WHEN** a client reads `backlog.csv`
- **THEN** the system returns its text

#### Scenario: Read missing file
- **WHEN** a client reads a file that does not exist
- **THEN** the system returns a not-found error

#### Scenario: File locked by another program
- **WHEN** a write fails because another program (for example Excel) holds the file open
- **THEN** the system returns an error identifying the file as locked or unwritable, and the file's existing contents are left unchanged

### Requirement: Create a new file
Creating a backlog is described by the `backlog-folder-layout` capability. The system SHALL NOT overwrite an existing backlog.

#### Scenario: Name is free
- **WHEN** a client creates `new-backlog` and no such folder exists
- **THEN** the backlog is created and `new-backlog` is returned

#### Scenario: Name is taken
- **WHEN** a client creates `new-backlog` and it already exists
- **THEN** `new-backlog-2` is created, the original is untouched and `new-backlog-2` is returned

### Requirement: Rename a file
The system SHALL rename a backlog as described by the `backlog-folder-layout` capability: the folder is renamed and every file moves with it. The new name MUST be valid and MUST NOT already exist.

#### Scenario: Successful rename
- **WHEN** a client renames `new-backlog` to `sprint-12`
- **THEN** the folder becomes `sprint-12` and that name is returned

#### Scenario: Target exists
- **WHEN** a client renames a backlog to a name that already exists
- **THEN** the system returns a conflict error and neither backlog changes

#### Scenario: Invalid name
- **WHEN** the new name is empty or contains `\`, `/`, `:`, `*`, `?`, `"`, `<`, `>` or `|`
- **THEN** the system rejects the rename with an error

### Requirement: Open data folder in File Explorer
The system SHALL open the data folder in the operating system's file manager on request.

#### Scenario: Open folder
- **WHEN** a client requests the folder be opened
- **THEN** File Explorer opens showing the data folder

### Requirement: The data folder comes from the project config
The system SHALL take the data folder it serves from the project config's `dataDir`. It SHALL NOT read it from an environment variable.

#### Scenario: Config names a folder
- **WHEN** the config's `dataDir` is `D:\planner-data`
- **THEN** the store folders served are the ones inside `D:\planner-data`

### Requirement: The server serves a new data folder without a restart
The server SHALL start using a new data directory as soon as the config is saved with it, for the file API and the backup routes. It SHALL refuse the switch with a busy error while a write or a backup is running, and the old folder SHALL be left unchanged.

#### Scenario: Switch while idle
- **WHEN** a new data directory is saved and no write or backup is running
- **THEN** the next list, read or write request is answered from the new directory

#### Scenario: Switch during a write
- **WHEN** a new data directory is saved while a write or a backup is running
- **THEN** the server answers busy, the config and the served folder stay as they were, and nothing is written to either folder by the refused request

### Requirement: Project settings routes
The server SHALL expose routes to read the project settings, save them, run init, check a directory for planner files, and copy the current data into another directory. Each route that takes a directory SHALL apply the confinement rules of the `project-config` capability. These routes SHALL NOT reach any file other than the config file and the folders init and the copy create.

#### Scenario: Read settings
- **WHEN** a client requests the project settings
- **THEN** the reply holds the project name, the data directory and the config file path

#### Scenario: Directory outside the rules
- **WHEN** a client saves, checks, initialises or copies into a directory the confinement rules refuse
- **THEN** the server rejects the request and changes no file

#### Scenario: Remote client
- **WHEN** another machine on the network calls a settings route
- **THEN** the connection is refused, as for every other route
