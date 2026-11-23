# Spec Delta

## ADDED Requirements

### Requirement: The design files are committed and kept by archive
The table SHALL list `designs.json` and `design-index.csv`, both written by `jois-story-design`, as `committed`. Archive SHALL NOT delete or edit either file, and the printed `.gitignore` block SHALL re-include both.

#### Scenario: Rows of the table
- **WHEN** the table is read
- **THEN** it lists `designs.json` and `design-index.csv` as `committed`, written by `jois-story-design`

#### Scenario: Archive keeps the index
- **WHEN** a slice is archived and its working files are deleted
- **THEN** `design-index.csv` and `designs.json` are unchanged

#### Scenario: Status matches the table
- **WHEN** a mock `.plans/` tree holds a `design-index.csv` and the printed block is the repo's `.gitignore`
- **THEN** `git status --porcelain --untracked-files=all` lists the file as untracked and not ignored
