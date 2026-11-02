## MODIFIED Requirements

### Requirement: Access is limited to a registered data folder
The system SHALL expose file operations only for the CSV files of a backlog folder directly inside the data folder, under the fixed file names of the `backlog-folder-layout` capability. It SHALL NOT read, write, rename or list anything else.

#### Scenario: Path traversal is rejected
- **WHEN** a request names a backlog such as `../secret` or `a/b`
- **THEN** the system rejects the request with an error and touches no file

#### Scenario: Non-CSV files are ignored
- **WHEN** a backlog folder holds `notes.txt` and `user-stories.csv`
- **THEN** only `user-stories.csv` can be reached

### Requirement: List files
The system SHALL list the backlogs, meaning the subfolders of the data folder that hold `user-stories.csv`, sorted by name, each by its folder name.

#### Scenario: Folder with files
- **WHEN** the data folder holds `b/user-stories.csv` and `a/user-stories.csv`
- **THEN** the list returns `a` then `b`

#### Scenario: Empty folder
- **WHEN** the data folder holds no backlog folder
- **THEN** the list is empty and no error is raised

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

### Requirement: Writes are logged
Every write by the file API or a writer SHALL append one line of JSON to `<dataDir>/logs/writes.jsonl` with the time, the writer (`portal` for the file API, or the name of the script or tool), the backlog name, the kind of file, the byte size of the new content and a short hash of it. The log folder SHALL NOT be reachable through the file API. A failure to log SHALL be reported on standard error and SHALL NOT fail or undo the write. The log SHALL hold no file contents.

#### Scenario: Portal save logged
- **WHEN** the portal saves the proposals of backlog `data-portal`
- **THEN** the log gains a line naming writer `portal`, backlog `data-portal`, kind `proposals`, its size and hash

#### Scenario: Writer logged
- **WHEN** `write_proposals` adds stories to backlog `data-portal`
- **THEN** a line names writer `write_proposals` for that backlog and kind, and a later `portal` line shows who wrote it last

#### Scenario: Log not reachable
- **WHEN** a client asks the file API for `logs`
- **THEN** it is rejected as unknown

#### Scenario: Log failure does not block
- **WHEN** the log file cannot be written
- **THEN** the data write still succeeds and a message appears on standard error

## REMOVED Requirements

### Requirement: Back up a backlog
**Reason**: Backups were not useful to the user, so the feature is removed with the backlog folder change.
**Migration**: None. Backups already on disk are left where they are and are no longer read, listed or copied.

### Requirement: List the backups of a backlog
**Reason**: Backups were not useful to the user, so the feature is removed with the backlog folder change.
**Migration**: None. Backups already on disk are left where they are and are no longer read, listed or copied.

### Requirement: Compare backups
**Reason**: Backups were not useful to the user, so the feature is removed with the backlog folder change.
**Migration**: None. Backups already on disk are left where they are and are no longer read, listed or copied.
