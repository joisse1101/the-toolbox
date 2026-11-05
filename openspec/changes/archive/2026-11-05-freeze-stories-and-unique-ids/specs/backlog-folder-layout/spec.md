## MODIFIED Requirements

### Requirement: What a backlog folder holds
A backlog folder SHALL hold, under fixed names, `user-stories.csv`, `user-stories/review.csv` and `user-stories/proposals.csv`, `lexicon.csv` and `lexicon/lexicon-suggestions.csv`, which are the starting files and always exist in a backlog the system creates. It SHALL also hold `backlog.json`, which holds the backlog's initials (see `backlog-initials`) and always exists in a backlog the system creates. It SHALL also hold, when they exist: the `user-stories/review.csv.decided` sidecar; `repo.json`; `context-map.json` and `context-map.md`; and the folder `slices/` (one folder per slice). A reader SHALL still treat a missing starting file as an empty one, so a folder that holds only `user-stories.csv` keeps working, and a folder without `backlog.json` SHALL work with the default initials until they are saved.

#### Scenario: Starting files present
- **WHEN** the system creates a backlog
- **THEN** its folder holds the five starting files and `backlog.json`, and none of the other files or folders

#### Scenario: Optional files missing
- **WHEN** a backlog folder holds only `user-stories.csv`
- **THEN** it works with no review, proposals, lexicon, suggestions or `backlog.json`, and each file is created when first needed

### Requirement: Create a backlog
The system SHALL create a backlog on request by creating its folder holding the five starting files, each with only its columns and no rows, and `backlog.json` holding the backlog's default initials, the lowest `B<n>` that no sibling backlog uses (see `backlog-initials`). The backlog SHALL be built from nothing: no story, term, proposal, suggestion or slice SHALL be taken from another backlog, the initials SHALL be fresh and not copied from another backlog, and no request SHALL ask the system to copy one. The set of starting files SHALL be defined once and used by every way the system creates a backlog. It SHALL NOT overwrite an existing folder. When the name is taken, it SHALL use the next free numbered name (`name-2`, `name-3`, ...) and return the name used. If any file cannot be written, the system SHALL remove the folder it just made and report the failure, so no partial backlog is left.

#### Scenario: Name is free
- **WHEN** a client creates `sprint-12` and no such folder exists
- **THEN** `sprint-12` holds `user-stories.csv`, `user-stories/review.csv`, `user-stories/proposals.csv`, `lexicon.csv` and `lexicon/lexicon-suggestions.csv`, each with its header row only, and `backlog.json` with the default initials, and `sprint-12` is returned

#### Scenario: Name is taken
- **WHEN** a client creates `sprint-12` and the folder exists
- **THEN** `sprint-12-2` is created, the original is untouched and `sprint-12-2` is returned

#### Scenario: Another backlog exists
- **WHEN** a client creates a backlog while `iam` holds stories, terms, proposals and slices
- **THEN** the new backlog holds none of them, its initials differ from those of `iam`, and `iam` is unchanged

#### Scenario: A file cannot be written
- **WHEN** writing one of the starting files, or `backlog.json`, fails
- **THEN** the new folder is removed, no backlog with that name is listed and the failure is reported

### Requirement: Rename a backlog
The system SHALL rename a backlog by renaming its folder, so every file and slice moves with it, `backlog.json` included. The new name MUST be valid, MUST NOT already exist and MUST NOT be a reserved name (`logs`). A rename SHALL NOT change the backlog's initials, and no story ID SHALL change because of it.

#### Scenario: Successful rename
- **WHEN** a client renames `iam` to `identity`
- **THEN** the folder becomes `identity` with all its files, and `identity` is returned

#### Scenario: Initials kept
- **WHEN** a client renames `iam`, whose initials are `B1`, to `identity`
- **THEN** `identity` holds `backlog.json` with `B1` and no story ID changed

#### Scenario: Target exists
- **WHEN** the new name is already a folder in the data directory
- **THEN** the system returns a conflict error and nothing changes

#### Scenario: A file is locked
- **WHEN** the rename fails because another program holds a file in the folder open
- **THEN** the system returns a locked error and the folder keeps its old name
