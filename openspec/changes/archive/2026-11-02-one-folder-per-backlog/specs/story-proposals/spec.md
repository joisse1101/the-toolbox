## MODIFIED Requirements

### Requirement: Proposals store
The system SHALL keep proposed stories in the file `user-stories/proposals.csv` in the backlog's folder (for example `data-portal/user-stories/proposals.csv` for `data-portal/user-stories.csv`). The file API SHALL expose it as the kind `proposals`, so the access rules of the `csv-file-store` capability apply. A proposals file SHALL have the same columns as a backlog CSV, SHALL be opened by Excel as UTF-8, and its content SHALL be git-ignored. The file need not exist: a backlog without one has no proposed stories, and the file SHALL be created when the first proposed story is added.

#### Scenario: Same name as the backlog
- **WHEN** the backlog `data-portal` is open and `data-portal/user-stories/proposals.csv` exists
- **THEN** that file holds its proposed stories

#### Scenario: Same rules as other stores
- **WHEN** a request names `../x` as the backlog of the proposals kind
- **THEN** it is rejected and no file is touched
