# backlog-folder-layout Specification

## Purpose

Defines how a backlog is stored as one self-contained folder, how a backlog is named and found, and how data in the older layout (one folder per kind of file) is copied into it. A backlog can then be copied, shared, moved or deleted as a unit.

## Requirements

### Requirement: A backlog is one folder
Each backlog SHALL be one folder directly inside the data directory, named by the backlog's name. A subfolder SHALL count as a backlog if and only if it holds `user-stories.csv`.

#### Scenario: Backlog found by its file
- **WHEN** the data directory holds `iam/user-stories.csv`, `payments/user-stories.csv` and a folder `logs/`
- **THEN** the backlogs are `iam` and `payments`, and `logs` is not one

### Requirement: What a backlog folder holds
A backlog folder SHALL hold, under fixed names, `user-stories.csv`, and when they exist: `user-stories/review.csv` (with its `user-stories/review.csv.decided` sidecar) and `user-stories/proposals.csv`; `lexicon.csv` and `lexicon/lexicon-suggestions.csv`; `repo.json`; `context-map.json` and `context-map.md`; and the folder `slices/` (one folder per slice).

#### Scenario: Optional files missing
- **WHEN** a backlog folder holds only `user-stories.csv`
- **THEN** it works with no review, proposals, lexicon or suggestions, and each file is created when first needed

### Requirement: A backlog is named by its folder name
Everywhere a backlog is named (the portal, the file API and the story skills' scripts) it SHALL be named by its folder name, without `.csv`. A name given with a trailing `.csv` SHALL be read as the name without it. A name SHALL follow the same rules as a folder name valid on Windows and SHALL NOT contain a path separator.

#### Scenario: Name with and without extension
- **WHEN** a skill script is given `iam.csv` or `iam`
- **THEN** both mean the backlog `iam`

#### Scenario: Unsafe name
- **WHEN** a request names a backlog such as `../x` or `a/b`
- **THEN** it is rejected and nothing is read or written

### Requirement: Files are addressed by backlog and kind
The file API SHALL address a backlog's CSV files by the backlog name and the kind of file (`backlog`, `review`, `proposals`, `lexicon`, `lexicon-suggestions`), and SHALL map each kind to its fixed file name in the backlog folder. It SHALL reach only those files. It SHALL NOT reach `slices/`, `logs/` or any other file or folder.

#### Scenario: Read a lexicon
- **WHEN** a client reads the `lexicon` of backlog `iam`
- **THEN** the system returns `iam/lexicon.csv`

#### Scenario: Other files unreachable
- **WHEN** a client asks for the kind `slices`, or for any name outside the five kinds
- **THEN** the system answers that the kind is unknown

### Requirement: Create a backlog
The system SHALL create a backlog on request by creating its folder holding an empty `user-stories.csv` with the backlog's columns. It SHALL NOT overwrite an existing folder. When the name is taken, it SHALL use the next free numbered name (`name-2`, `name-3`, ...) and return the name used.

#### Scenario: Name is free
- **WHEN** a client creates `sprint-12` and no such folder exists
- **THEN** `sprint-12/user-stories.csv` is created and `sprint-12` is returned

#### Scenario: Name is taken
- **WHEN** a client creates `sprint-12` and the folder exists
- **THEN** `sprint-12-2` is created, the original is untouched and `sprint-12-2` is returned

### Requirement: Rename a backlog
The system SHALL rename a backlog by renaming its folder, so every file and slice moves with it. The new name MUST be valid, MUST NOT already exist and MUST NOT be a reserved name (`logs`).

#### Scenario: Successful rename
- **WHEN** a client renames `iam` to `identity`
- **THEN** the folder becomes `identity` with all its files, and `identity` is returned

#### Scenario: Target exists
- **WHEN** the new name is already a folder in the data directory
- **THEN** the system returns a conflict error and nothing changes

#### Scenario: A file is locked
- **WHEN** the rename fails because another program holds a file in the folder open
- **THEN** the system returns a locked error and the folder keeps its old name

### Requirement: Project-level files stay at the data directory
The write log SHALL stay at `<dataDir>/logs/writes.jsonl`. Each line SHALL name the backlog and the kind of file written, in place of the former store and file name.

#### Scenario: Logged write
- **WHEN** the portal saves the proposals of backlog `iam`
- **THEN** a line names writer `portal`, backlog `iam`, kind `proposals`, the size and the hash

### Requirement: Migrate the older layout by copy
The system SHALL, only on the user's request from the Settings tab, copy data in the older layout (folders `backlogs/`, `reviews/`, `proposals/`, `lexicons/`, `lexicon-suggestions/`, and `diagrams/`) into the new layout in the current data directory, one folder per `backlogs/<name>.csv`. It SHALL reply with what was copied and what was skipped.

#### Scenario: Older layout present
- **WHEN** the data directory holds `backlogs/iam.csv`, `reviews/iam.csv` and `diagrams/iam/UC-login/`, and the user asks to migrate
- **THEN** `iam/user-stories.csv`, `iam/user-stories/review.csv` and `iam/slices/UC-login/` exist with the same contents and the older files are unchanged

#### Scenario: A file in the older layout has no backlog
- **WHEN** `reviews/ghost.csv` exists with no `backlogs/ghost.csv`
- **THEN** it is listed as skipped with the reason and nothing is created for it

### Requirement: Migration never loses data
The migration SHALL NOT overwrite an existing file and SHALL NOT change or remove anything in the older layout. It SHALL read each copied file back to check it.

#### Scenario: Target file exists
- **WHEN** `iam/user-stories.csv` already exists
- **THEN** it keeps its contents, is listed as skipped and the rest of `iam` is still copied

#### Scenario: Read-back differs
- **WHEN** a copied file does not read back the same
- **THEN** the system reports the file as failed and leaves the older layout in place

### Requirement: The older layout is not read
After this change the system SHALL read and write only the new layout. It SHALL detect the older layout and tell the user to migrate, without reading it as data.

#### Scenario: Older layout detected
- **WHEN** the data directory holds `backlogs/iam.csv` and no backlog folder
- **THEN** the portal lists no backlog and shows a message that names the Settings tab's migration

### Requirement: Paths named elsewhere in the specs
Where another spec of this project names a path such as `<store>/<backlog>.csv`, it SHALL be read as the fixed-name file of that backlog in its folder: `backlogs/` as `user-stories.csv`, `reviews/` as `user-stories/review.csv`, `proposals/` as `user-stories/proposals.csv`, `lexicons/` as `lexicon.csv`, `lexicon-suggestions/` as `lexicon/lexicon-suggestions.csv`, and `diagrams/<backlog>/<slice>/` as `<backlog>/slices/<slice>/`, with `repo.json` and the context map at `<backlog>/` itself.

#### Scenario: Older wording
- **WHEN** a spec says the review is `reviews/<backlog>.csv`
- **THEN** it means `<backlog>/user-stories/review.csv`
