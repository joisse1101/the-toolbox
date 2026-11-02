## MODIFIED Requirements

### Requirement: Suggestions file per backlog
Each backlog SHALL have at most one lexicon suggestions file, `lexicon/lexicon-suggestions.csv` in its backlog folder. The file API SHALL expose it as the kind `lexicon-suggestions`. The columns, matched by header name ignoring case, SHALL be `Term`, `Action` (`rename`, `delete` or `edit`), `New name` (a rename only), `Add to Avoid` (`;`-separated words, a rename only), `Reason` `Status` (`open`, `applied` or `dismissed`; anything else reads as `open`) and `Edit` (an `edit` row only: the fields it changes, each with its old and new value, as JSON). A row whose `Action` is not `rename`, `delete` or `edit` SHALL be kept in the file and not shown. A backlog without the file SHALL work without error, and the file SHALL be created when the first suggestion is written. An unknown column SHALL be kept unchanged when the file is saved.

#### Scenario: No file yet
- **WHEN** the open backlog has no suggestions file
- **THEN** the Lexicon tab shows no suggestions and no error

#### Scenario: Unknown column kept
- **WHEN** the file has an extra column and the user dismisses a suggestion
- **THEN** the saved file still holds that column with its values
