# Spec Delta

## ADDED Requirements

### Requirement: The data folder comes from the project config
The system SHALL take the data folder it serves from the project config's `dataDir`. It SHALL NOT read it from an environment variable.

#### Scenario: Config names a folder
- **WHEN** the config's `dataDir` is `D:\planner-data`
- **THEN** the store folders served are the ones inside `D:\planner-data`

### Requirement: The server switches data folder without a restart
The server SHALL start using a new data directory as soon as the config is saved with it, for the file API, the backup routes and the write log. It SHALL refuse the switch with a busy error while a write or a backup is running, and the old folder SHALL be left unchanged.

#### Scenario: Switch while idle
- **WHEN** a new data directory is saved and no write or backup is running
- **THEN** the next list, read or write request is answered from the new directory

#### Scenario: Switch during a write
- **WHEN** a new data directory is saved while a write or a backup is running
- **THEN** the server answers busy, the config and the served folder stay as they were, and nothing is written to either folder by the refused request

#### Scenario: Write log follows the switch
- **WHEN** the server has switched to a new data directory
- **THEN** later writes are logged in the new directory's `logs/writes.jsonl`

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
