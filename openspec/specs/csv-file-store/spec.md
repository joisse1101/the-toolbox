## Purpose

Gives browser-based tools safe read and write access to CSV files in a single designated data folder on the local machine, so tools can persist their data as plain CSV without direct disk access.

## Requirements

### Requirement: Access is limited to a registered data folder
The system SHALL expose file operations only for CSV files located directly inside a data folder registered for the requesting tool. It SHALL NOT read, write, rename or list anything outside that folder, and SHALL NOT operate on subfolders.

#### Scenario: Path traversal is rejected
- **WHEN** a request names a file such as `../secret.csv` or `sub/file.csv`
- **THEN** the system rejects the request with an error and touches no file

#### Scenario: Non-CSV files are ignored
- **WHEN** the data folder contains `notes.txt` and `backlog.csv`
- **THEN** listing returns only `backlog.csv`

### Requirement: Local-only service
The system SHALL accept connections only from the local machine.

#### Scenario: Remote connection
- **WHEN** another machine on the network attempts to reach the service
- **THEN** the connection is refused

### Requirement: List files
The system SHALL list the CSV files in the data folder, sorted by name.

#### Scenario: Folder with files
- **WHEN** the data folder contains `b.csv` and `a.csv`
- **THEN** the list returns `a.csv` then `b.csv`

#### Scenario: Empty folder
- **WHEN** the data folder contains no CSV files
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
The system SHALL create a new CSV file on request and SHALL NOT overwrite an existing file. When the requested name is already taken, it SHALL choose the next free numbered name (`name-2.csv`, `name-3.csv`, ...) and return the name actually used.

#### Scenario: Name is free
- **WHEN** a client creates `new-backlog.csv` and it does not exist
- **THEN** the file is created and `new-backlog.csv` is returned

#### Scenario: Name is taken
- **WHEN** a client creates `new-backlog.csv` and it already exists
- **THEN** `new-backlog-2.csv` is created, the original is untouched, and `new-backlog-2.csv` is returned

### Requirement: Rename a file
The system SHALL rename a CSV file within the data folder. The new name MUST end in `.csv` (appended if missing), MUST NOT contain path separators or characters invalid in Windows filenames, and MUST NOT already exist.

#### Scenario: Successful rename
- **WHEN** a client renames `new-backlog.csv` to `sprint-12`
- **THEN** the file becomes `sprint-12.csv` and that name is returned

#### Scenario: Target exists
- **WHEN** a client renames a file to a name that already exists
- **THEN** the system returns a conflict error and neither file changes

#### Scenario: Invalid name
- **WHEN** the new name is empty or contains `\`, `/`, `:`, `*`, `?`, `"`, `<`, `>` or `|`
- **THEN** the system rejects the rename with an error

### Requirement: Open data folder in File Explorer
The system SHALL open the data folder in the operating system's file manager on request.

#### Scenario: Open folder
- **WHEN** a client requests the folder be opened
- **THEN** File Explorer opens showing the data folder
