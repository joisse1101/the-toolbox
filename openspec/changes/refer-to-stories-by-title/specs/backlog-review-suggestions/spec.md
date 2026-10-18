## ADDED Requirements

### Requirement: Rows written through the tool name the story's Title
When the review writer is called through the `story-tools` server, each row SHALL carry `storyTitle`, the story's current Title, and a `Depends On` row SHALL carry `targetTitle`, the Title of the story named in `suggested`. The pairs SHALL be checked against the backlog as the `story-tools-mcp` capability describes, and a mismatch SHALL be reported without writing any row. The Titles are used only for this check: they SHALL NOT be stored, the review file's columns SHALL NOT change, and the portal SHALL read and apply the rows as before. When the script is run from the command line these keys are optional, and a Title that is given is checked.

#### Scenario: Row for a renumbered story
- **WHEN** a row names `IAM-0004` with `storyTitle` `Reset password by email` and the backlog has since been renumbered so that `IAM-0004` is another story
- **THEN** nothing is written and the message says what `IAM-0004` holds now and which story has the Title

#### Scenario: Dependency target checked
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0002` and `targetTitle` `Sign in`, and `IAM-0002` has another Title
- **THEN** nothing is written and the message names the row

#### Scenario: Stored row unchanged
- **WHEN** a row with `storyTitle` is accepted
- **THEN** the review file holds the same columns and values as a row written without it

#### Scenario: Script from the command line
- **WHEN** the script is run with rows that have no `storyTitle`
- **THEN** they are written as before
