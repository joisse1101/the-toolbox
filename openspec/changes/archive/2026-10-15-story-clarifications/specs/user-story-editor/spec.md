## MODIFIED Requirements

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria, Notes, Locked, Clarifications`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `User Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Locked` SHALL hold `Yes` for a locked story and be empty otherwise. Any other value SHALL be read as unlocked.
- `Clarifications` SHALL hold the story's question and answer pairs in the form defined by the `story-clarifications` capability, or be empty.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title`, `Locked` or `Clarifications` column SHALL be accepted and the columns added to it when it is saved. The tool SHALL NOT translate older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As a "team lead", I want "to export a backlog", so that "I can share it"
- **THEN** the `User Story` cell contains `As a team lead, I want to export a backlog, so that I can share it`

#### Scenario: Multiple criteria in one cell
- **WHEN** a story has two criteria
- **THEN** the `User Acceptance Criteria` cell contains two lines beginning `AC1: Given ` and `AC2: Given `, separated by a line break

#### Scenario: Round trip
- **WHEN** a story containing commas, quotes and a line break in its text is saved and the file is reloaded
- **THEN** every field is identical to what was entered

#### Scenario: Story with no criteria
- **WHEN** a story has no criteria text
- **THEN** its `User Acceptance Criteria` cell is empty

#### Scenario: ID and dependencies saved
- **WHEN** story `IAM-0003` depends on `IAM-0001` and `DD-0002`
- **THEN** its row has `IAM-0003` in `ID` and `IAM-0001;DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On`, `Title`, `Locked` and `Clarifications` columns is opened and saved
- **THEN** the saved file has all five columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

#### Scenario: Lock saved and reloaded
- **WHEN** a locked story is saved and the file is reloaded
- **THEN** the story is still locked



#### Scenario: Clarifications saved
- **WHEN** a story with a question and its answer is saved and the file is reloaded
- **THEN** the `Clarifications` cell holds `Q1: ...` and `A1: ...` lines and the story shows the same pair
