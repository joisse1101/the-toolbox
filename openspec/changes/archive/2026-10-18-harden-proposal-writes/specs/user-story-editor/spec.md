## MODIFIED Requirements

### Requirement: Story fields
For each story the tool SHALL provide: Epic, Feature and Title as short text fields, where Title is the title of the user story; an "As" text field (the role, written with its article, for example "a team lead"), and "I want" and "So that" text fields; Sprint points as a row of one-click buttons (see "Sprint points selector"); and Priority as a dropdown with the options Critical, High, Medium and Low, plus an empty "none" choice. Priority SHALL be optional and new stories SHALL start with none selected. The tool SHALL also provide an optional multi-line free-text Notes field, stored as-is and not parsed.

#### Scenario: Notes field
- **WHEN** the user types several lines into Notes
- **THEN** the field accepts the line breaks and the text is saved unchanged in the `Notes` cell, and an empty Notes field saves as an empty cell

#### Scenario: Priority is optional
- **WHEN** a new story is created
- **THEN** Priority shows "none" and the story can be saved without one

#### Scenario: Priority value not in the list
- **WHEN** a loaded file has a Priority such as `Urgent` that is not one of the four options
- **THEN** the dropdown shows `Urgent` as an extra selected option and the value is written back unchanged unless the user picks another

#### Scenario: Hierarchy fields
- **WHEN** the user opens a story
- **THEN** the form shows Epic, Feature and Title, and no Capability field

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria, Notes, Locked, Clarifications`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As <as>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `User Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Locked` SHALL hold `Yes` for a locked story and be empty otherwise. Any other value SHALL be read as unlocked.
- `Clarifications` SHALL hold the story's question and answer pairs in the form defined by the `story-clarifications` capability, or be empty.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title`, `Locked` or `Clarifications` column SHALL be accepted and the columns added to it when it is saved. The tool SHALL NOT translate older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As "a team lead", I want "to export a backlog", so that "I can share it"
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

### Requirement: Parsing story and criteria text
When loading a file, the tool SHALL split the `User Story` cell into As / I want / So that using the literal keywords `As`, `I want` and `so that` (case-insensitive, first occurrence of each, in that order), and SHALL split the `User Acceptance Criteria` cell into criteria by line, each into Given / When / Then using the keywords `Given`, `when` and `then` (case-insensitive, first occurrence of each, in that order). The comma immediately before a keyword SHALL be treated as a separator and removed from the preceding field, and a missing comma SHALL be tolerated. The leading `AC<n>:` label SHALL be ignored and criteria renumbered from their position.

#### Scenario: Comma-separated syntax
- **WHEN** a cell reads `As a team lead, I want to export, so that I can share`
- **THEN** the fields load as `a team lead`, `to export` and `I can share`, with no trailing commas

#### Scenario: Missing commas tolerated
- **WHEN** a cell reads `As a team lead I want to export so that I can share`
- **THEN** it loads the same fields, and the next save rewrites it with commas

#### Scenario: Cell edited in Excel
- **WHEN** the `User Acceptance Criteria` cell is edited in Excel and still follows the syntax
- **THEN** the tool loads each line into its own Given/When/Then group

#### Scenario: Text that does not match the syntax
- **WHEN** a `User Story` or criterion line does not contain its keywords in order
- **THEN** the tool shows a warning for that story, leaves the original cell text untouched on disk, and only replaces it if the user edits that group's fields

#### Scenario: Story sentence with "an"
- **WHEN** a cell reads `As an approver, I want to sign off, so that releases are controlled`
- **THEN** the fields load as `an approver`, `to sign off` and `releases are controlled`, the story is not reported as free text, and saving writes the same sentence

### Requirement: Live preview of story and criteria
Beneath the user story fields and beneath the acceptance criteria group, the tool SHALL show a read-only preview of the exact text that will be written to the corresponding CSV cell, updating as the user types.

#### Scenario: Story preview
- **WHEN** the user types into As, I want or So that
- **THEN** the preview shows `As …, I want …, so that …` with the entered text

#### Scenario: Criteria preview
- **WHEN** the user has two criteria
- **THEN** the preview shows two lines, `AC1: Given …, when …, then …` and `AC2: …`
