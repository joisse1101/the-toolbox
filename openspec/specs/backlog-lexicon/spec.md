## Purpose

Gives each backlog one place to define the terms its stories use, so names and meanings stay the same as the backlog grows, and so the AI skills draft with the agreed terms.

## Requirements

### Requirement: Lexicon file per backlog
Each backlog SHALL have at most one lexicon, a CSV file in the data folder's `lexicons` folder with the same file name as the backlog (the lexicon of `backlogs/IAM.csv` is `lexicons/IAM.csv`). The file API SHALL expose it through a `lexicons` store like the other stores. The lexicon of one backlog SHALL NOT be visible in or affect another backlog. A backlog without a lexicon file SHALL work without error, and the file SHALL be created when the first term is saved.

#### Scenario: Lexicon follows the backlog
- **WHEN** the open backlog is `IAM.csv`
- **THEN** the Lexicon tab shows the terms of `lexicons/IAM.csv`, and a backlog `Reports.csv` shows its own `lexicons/Reports.csv`

#### Scenario: No lexicon yet
- **WHEN** the open backlog has no lexicon file
- **THEN** the Lexicon tab shows an empty list with no error, and saving a first term creates the file

### Requirement: Term format
A term SHALL be one row of the lexicon CSV. The columns, matched by header name ignoring case, SHALL be `Term` (the full phrase stories use, for example "Dataset attribute"), `Part of` (optional, the name of another term), `Definition` (required), `Avoid` (optional, a `;`-separated list of words stories must not use for this term) and `Notes` (optional, free text). Cells MAY span several lines. Term names SHALL be unique ignoring case. A column that is not one of these SHALL be kept unchanged, and a known column missing from the file SHALL be added when the file is saved. Other cells SHALL NOT change when a term is saved.

#### Scenario: Row read
- **WHEN** a row has Term `User`, Definition `A person with a login.` and Avoid `customer; member`
- **THEN** the tab shows the term "User" with that definition and those two avoided words

#### Scenario: Unknown column kept
- **WHEN** the file has an extra column `Owner` and the user edits a definition
- **THEN** the saved file still has the `Owner` column with its values

#### Scenario: Excel-style header
- **WHEN** the header is `term,PART OF,definition,avoid,notes`
- **THEN** the columns are recognised

#### Scenario: Duplicate name
- **WHEN** a term "User" exists and the user saves another term named "user"
- **THEN** the save is refused with a message that the term already exists

### Requirement: Term rules
The system SHALL refuse to save a term that has no Definition; whose `Part of` names a term that does not exist, the term itself, or a term that makes a cycle; or whose `Avoid` list contains the name of any term in the lexicon. It SHALL refuse to delete a term while another term's `Part of` names it, and the message SHALL name those terms. Renaming a term SHALL update the `Part of` of every term that named it, and the system SHALL NOT change any other cell. A problem that already exists in the file SHALL NOT block saving a term unrelated to it.

#### Scenario: Missing parent
- **WHEN** the user saves "Dataset attribute" with `Part of: Dataset` and there is no term "Dataset"
- **THEN** the save is refused naming "Dataset"

#### Scenario: Avoid word is a term
- **WHEN** the user adds "customer" to the Avoid list of "User" and "Customer" is a defined term
- **THEN** the save is refused with a message that "customer" is a defined term

#### Scenario: Parent in use
- **WHEN** the user deletes "Dataset" while "Dataset attribute" has `Part of: Dataset`
- **THEN** the delete is refused and the message names "Dataset attribute"

#### Scenario: Rename follows children
- **WHEN** the user renames "Dataset" to "Data set"
- **THEN** "Dataset attribute" now has `Part of: Data set` and no other cell changed

#### Scenario: Old problem does not block
- **WHEN** the file already has a term whose `Part of` names a missing term, and the user adds an unrelated term
- **THEN** the new term is saved

### Requirement: Lexicon tab
The story portal SHALL show a Lexicon tab for the open backlog, always present like the Proposed tab. It SHALL list the terms with each child term grouped and indented under its parent, show the definition and avoided words in the list, filter the list by a search that matches term, definition and avoided words, and let the user add, edit, rename and delete a term. Changes SHALL be saved automatically, with the same retry behaviour as the other tabs when the file is locked.

#### Scenario: Grouped by parent
- **WHEN** "Dataset attribute" has `Part of: Dataset`
- **THEN** it is listed indented directly under "Dataset"

#### Scenario: Search
- **WHEN** the user types "member"
- **THEN** the list shows the terms whose name, definition or avoided words contain "member", for example "User"

#### Scenario: Edit saved
- **WHEN** the user changes a definition in the form
- **THEN** the file is saved without a separate save button, and a reload shows the new definition

#### Scenario: File locked
- **WHEN** the lexicon file is held open by another program such as Excel
- **THEN** the tab shows that the save is waiting and retries, as the other tabs do

### Requirement: Lexicon is backed up with its backlog
The lexicon of a backlog SHALL be part of that backlog's backup and of the Backups tab comparison, as described by the `csv-file-store` capability.

#### Scenario: Backup includes the lexicon
- **WHEN** the user presses Backup on a backlog that has a lexicon
- **THEN** the backup holds `lexicons/<backlog name>` and the Backups tab can compare it

### Requirement: Lexicon tab shows suggestions
When the open backlog has open lexicon suggestions, the Lexicon tab SHALL show them at the top of the tab, above the term form, with the count of open ones in the tab label, as described by `lexicon-suggestions`. A suggested rename, delete or edit SHALL change the lexicon only when the user applies it, and then through the same rules as renaming, deleting or editing a term by hand (`Term rules`). The tab SHALL otherwise behave as before when there are none.

#### Scenario: Suggestions listed
- **WHEN** the file holds two open suggestions
- **THEN** the tab shows both with Apply and Dismiss and the count 2

#### Scenario: Nothing applied by itself
- **WHEN** the tab is opened with an open delete suggestion
- **THEN** the term is still in the lexicon

#### Scenario: Same rules as by hand
- **WHEN** the user applies a delete of a term that has children
- **THEN** the message is the one a manual delete shows and the lexicon is unchanged

#### Scenario: Edit not applied by itself
- **WHEN** the tab is opened with an open edit of a term's definition
- **THEN** the term still has its old definition and the suggestion shows the difference
