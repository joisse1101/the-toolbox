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

### Requirement: Back up a backlog
The system SHALL, on request for a named backlog file, copy that backlog and its related files into a new timestamped folder `backups/<backlog name>/<YYYY-MM-DD_HHMMSS>/` inside the data folder, in local time. The folder SHALL hold the files under the same store folder names they have in the data folder: `user-stories/<name>`, and, when they exist, `reviews/<name>`, `proposals/<name>`, `lexicons/<name>` and `lexicon-suggestions/<name>`. The system SHALL NOT copy any other file, including the review's `.csv.decided` sidecar. The backlog file MUST exist; a missing review, proposals, lexicon or lexicon suggestions file SHALL be skipped without error. The response SHALL name the backup folder and list the files copied.

The `backups` folder SHALL NOT be a registered store: the list, read, write, create and rename operations SHALL NOT reach it.

#### Scenario: Backlog with a review and proposals
- **WHEN** a client requests a backup of `sprint-12.csv` and the backlog, review, proposals, lexicon and lexicon suggestions files all exist
- **THEN** a folder `backups/sprint-12.csv/<date>_<time>/` is created holding `user-stories/sprint-12.csv`, `reviews/sprint-12.csv`, `proposals/sprint-12.csv`, `lexicons/sprint-12.csv` and `lexicon-suggestions/sprint-12.csv`, and the originals are unchanged

#### Scenario: Backlog without a review or proposals
- **WHEN** a client requests a backup of `sprint-12.csv` and only the backlog file exists
- **THEN** the backup holds only `user-stories/sprint-12.csv` and the request succeeds

#### Scenario: Decided sidecar is not copied
- **WHEN** `reviews/sprint-12.csv.decided` exists next to the review file
- **THEN** the backup does not contain it

#### Scenario: Backlog does not exist
- **WHEN** a client requests a backup of a backlog file that does not exist
- **THEN** the system returns a not-found error and creates no backup folder

#### Scenario: Two backups in the same second
- **WHEN** a client requests a second backup of the same backlog in the same second as an earlier one
- **THEN** the earlier backup is left untouched and the new one is made in a folder with a numeric suffix (`<date>_<time>-2`)

#### Scenario: A file cannot be copied
- **WHEN** a file to copy is held open by another program (for example Excel) and cannot be read
- **THEN** the system returns a locked error naming the file and leaves no partial backup folder

#### Scenario: Invalid name
- **WHEN** the requested backlog name contains a path separator or any character invalid in a Windows file name
- **THEN** the system rejects the request and touches no file

#### Scenario: Backups are not reachable through the file API
- **WHEN** a client lists, reads or writes files using the store name `backups`
- **THEN** the system answers that the store is unknown

### Requirement: List the backups of a backlog
The system SHALL list the backups of a named backlog, newest first, each with its folder name and the files it holds. A backlog with no backups SHALL give an empty list, not an error.

#### Scenario: Several backups
- **WHEN** `sprint-12.csv` has backups `2026-10-14_093000` and `2026-10-15_143205`
- **THEN** the list returns `2026-10-15_143205` first, then `2026-10-14_093000`

#### Scenario: No backups yet
- **WHEN** a client lists the backups of a backlog that was never backed up
- **THEN** the list is empty and no error is raised

#### Scenario: Other entries are ignored
- **WHEN** the backlog's backup folder contains a folder or file whose name is not a backup folder name
- **THEN** it is not listed

### Requirement: Compare backups
The system SHALL compare two states of a backlog on request, where each state is one of the backlog's backups or the current files, and return a text diff. For each of `user-stories`, `reviews`, `proposals`, `lexicons` and `lexicon-suggestions` that exists in at least one of the two states, the CSV SHALL be turned into text with one field per line, labelled with its column name and grouped in one block per row, with a multi-line cell kept together under its label; a missing file counts as empty. The system SHALL return the line diff of those texts, marking blocks that only moved as moved, or report that there are no differences. Comparing a state with itself SHALL be refused. The comparison SHALL NOT change any file in the data folder or in a backup.

#### Scenario: A field was edited
- **WHEN** a client compares two backups and only the Priority of one story differs
- **THEN** the diff shows that story's `Priority:` line removed and added with the old and new value, and nothing else

#### Scenario: A multi-line cell
- **WHEN** an acceptance-criteria cell of a story gained a criterion on a new line
- **THEN** the diff shows only the added criterion line, under that story's `User Acceptance Criteria:` label

#### Scenario: A story was moved
- **WHEN** a story changed position between the two states and its content is the same
- **THEN** the diff marks its block as moved rather than removed in one place and added in another

#### Scenario: Backup against current
- **WHEN** a client compares a backup with the current state
- **THEN** the current backlog, review, proposals, lexicon and lexicon suggestions files are read as they are on disk

#### Scenario: A file exists on one side only
- **WHEN** the review file exists in the newer backup but not in the older one
- **THEN** the diff shows every row of the review as added

#### Scenario: A lexicon suggestion was applied
- **WHEN** a suggestion's Status changed from `open` to `applied` between two states
- **THEN** the diff shows that suggestion's `Status:` line changed and nothing else in that file

#### Scenario: No differences
- **WHEN** both states hold identical content
- **THEN** the response says there are no differences

#### Scenario: Same state twice
- **WHEN** a client compares a backup with itself
- **THEN** the system rejects the request with an error

#### Scenario: Unknown or malformed backup
- **WHEN** a client names a backup that does not exist, or a name that is not a backup folder name (for example `../x`)
- **THEN** the system returns a not-found or invalid-name error and reads nothing outside the backlog's backup folder

#### Scenario: git is not available
- **WHEN** the comparison is requested and git cannot be started
- **THEN** the system returns an error saying that git is needed for comparing backups, and backing up and listing still work
