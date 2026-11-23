# Spec Delta

## MODIFIED Requirements

### Requirement: What a backlog folder holds
A backlog folder SHALL hold, under fixed names, `user-stories.csv`, `user-stories/review.csv` and `user-stories/proposals.csv`, `lexicon.csv` and `lexicon/lexicon-suggestions.csv`, which are the starting files and always exist in a backlog the system creates. It SHALL also hold `backlog.json`, which holds the backlog's initials (see `backlog-initials`) and always exists in a backlog the system creates. It SHALL also hold, when they exist: the `user-stories/review.csv.decided` sidecar; `repo.json`; `context-map.json` and `context-map.md`; `designs.json` and `design-index.csv`, which `jois-story-design` writes; and the folder `slices/` (one folder per slice). A reader SHALL still treat a missing starting file as an empty one, so a folder that holds only `user-stories.csv` keeps working, and a folder without `backlog.json` SHALL work with the default initials until they are saved. A reader SHALL treat a missing `design-index.csv` as a file with no rows.

#### Scenario: Starting files present
- **WHEN** the system creates a backlog
- **THEN** its folder holds the five starting files and `backlog.json`, and none of the other files or folders

#### Scenario: Optional files missing
- **WHEN** a backlog folder holds only `user-stories.csv`
- **THEN** it works with no review, proposals, lexicon, suggestions, `backlog.json` or design files, and each file is created when first needed

#### Scenario: Design index missing
- **WHEN** a backlog folder has no `design-index.csv`
- **THEN** a reader sees a story index with no rows and no error

### Requirement: Files are addressed by backlog and kind
The file API SHALL address a backlog's CSV files by the backlog name and the kind of file (`backlog`, `review`, `proposals`, `lexicon`, `lexicon-suggestions`, `design-index`), and SHALL map each kind to its fixed file name in the backlog folder. It SHALL reach only those files. It SHALL NOT reach `designs.json`, `slices/`, `logs/` or any other file or folder.

#### Scenario: Read a lexicon
- **WHEN** a client reads the `lexicon` of backlog `iam`
- **THEN** the system returns `iam/lexicon.csv`

#### Scenario: Read a design index
- **WHEN** a client reads the `design-index` of backlog `iam`
- **THEN** the system returns `iam/design-index.csv`, or an empty file when the backlog has none

#### Scenario: Other files unreachable
- **WHEN** a client asks for the kind `slices`, or for any name outside the six kinds
- **THEN** the system answers that the kind is unknown
