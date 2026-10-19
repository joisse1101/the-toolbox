## MODIFIED Requirements

### Requirement: Script validates findings
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); uses a Field, Action, Area or Confidence outside the allowed values; has an empty `Suggested` (except an `unlock` row, which SHALL have an empty `Field` and `Suggested`); uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `User Acceptance Criteria`, or `add` on a Field other than `Depends On` and `User Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or is a `Depends On` `add` row whose entry is not a story ID in the backlog, is the story itself, or is a `NEW-<n>` that is not in the same Group. A `Depends On` `remove` row SHALL be accepted when the story lists the entry in its `Depends On`, whether or not a story holds that entry, and SHALL be rejected when the story does not list it; the entry may be a code no story holds, the story's own code or a `NEW-<n>`. It SHALL also reject an `unlock` row for a story that is not locked, and a batch that leaves a field-edit row for a locked story without an `unlock` row for the same story in the resulting review file (an `unlock` row written by an earlier batch counts). Each problem about a finding SHALL name the finding by its position in the input. When the input is not valid JSON, the script SHALL report the parser's message and the position of the failure. The script SHALL ignore any `Current` or `Status` the caller supplies.

#### Scenario: Unknown story
- **WHEN** a finding names `ZZ-0009`, which is not in the backlog
- **THEN** the script exits with an error naming `ZZ-0009` and no review file is created or changed

#### Scenario: Empty suggestion
- **WHEN** a finding that is not an `unlock` row has an empty `Suggested`
- **THEN** the script rejects it, because every finding must carry a field edit

#### Scenario: All problems reported together
- **WHEN** the input has an unknown Story ID and an invalid Action
- **THEN** the error output lists both

#### Scenario: Malformed JSON
- **WHEN** the input has a missing comma after the 3rd finding
- **THEN** the error includes the JSON parser's message and the position it reports, and nothing is written

#### Scenario: Unlock row for an unlocked story
- **WHEN** an `unlock` row names a story that is not locked
- **THEN** the batch is rejected and nothing is written

#### Scenario: Field edit on a locked story without unlock
- **WHEN** a batch has a `replace` row for a locked story and the review file would hold no `unlock` row for it
- **THEN** the batch is rejected, naming the story, and nothing is written

#### Scenario: Unlock row in an earlier batch
- **WHEN** an earlier batch wrote the `unlock` row for a locked story and a later `--append` batch adds a `replace` row for it
- **THEN** the later batch is accepted

#### Scenario: Unlock with a value
- **WHEN** an `unlock` row has a non-empty Field or Suggested
- **THEN** the batch is rejected

#### Scenario: Remove a link to a story that does not exist
- **WHEN** `IAM-0003` lists `IAM-0099` in `Depends On`, no story holds `IAM-0099`, and a `Depends On` `remove` row for `IAM-0003` has `suggested` `IAM-0099`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to the story itself
- **WHEN** `IAM-0003` lists `IAM-0003` in `Depends On` and a `remove` row for it has `suggested` `IAM-0003`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to a proposed story
- **WHEN** `IAM-0003` lists `NEW-4` in `Depends On` and a `remove` row for it has `suggested` `NEW-4`
- **THEN** the row is accepted and written, without a Group

#### Scenario: Remove a link the story does not list
- **WHEN** a `Depends On` `remove` row has `suggested` `IAM-0099` and the story does not list it
- **THEN** the batch is rejected, saying the story does not depend on `IAM-0099`

#### Scenario: Add keeps its checks
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0099`, which no story holds, or the story's own code
- **THEN** the batch is rejected and nothing is written

### Requirement: Applying a suggestion
Apply SHALL perform the edit through the same change path as a manual edit, so IDs, dependency links and autosave behave as for a manual edit: `replace` sets the field (for User Acceptance Criteria it replaces the matched criterion), `add` adds an acceptance criterion or a `Depends On` link, `remove` removes a `Depends On` link or the matched acceptance criterion (later criteria are renumbered), `append` adds the text to the end of Notes on a new line. After Apply the row's `Status` SHALL be `applied` in the review file. A `Depends On` `add` that would create a cycle or a link to a missing story SHALL NOT be applied and the user SHALL be told why. A `Depends On` `remove` SHALL remove the entry the row names from the story's `Depends On` as written, whether or not a story holds it now (a code no story holds, the story itself or a `NEW-<n>`), and SHALL NOT check what the entry means now: an entry that has since become a valid link is removed like any other.

A `User Acceptance Criteria` `replace` or `remove` row SHALL be matched to its criterion as follows: the criterion in the position named by the row's label (`AC<n>`) when its text equals the row's `Current`; otherwise the one criterion of the story whose text equals `Current`. The comparison SHALL ignore the `AC<n>:` label, case and whitespace, and SHALL NOT be approximate. When no criterion or more than one criterion matches, the row is stale. Applying a row SHALL NOT change which criterion any other open row matches, so open rows of one story can be applied one at a time in any order.

#### Scenario: Apply a replacement
- **WHEN** the user clicks Apply on a `replace` row for a story's Title
- **THEN** the Title becomes the suggested value, the backlog autosaves, and the row is `applied` in the review file

#### Scenario: Apply an added criterion
- **WHEN** the user clicks Apply on an `add` row for User Acceptance Criteria
- **THEN** a new criterion with the suggested Given, When and Then is added to the story and the criteria numbering stays sequential

#### Scenario: Dependency would create a cycle
- **WHEN** Apply on an `add` row for Depends On would close a dependency cycle
- **THEN** the backlog is unchanged, the row stays `open` and a message explains the reason

#### Scenario: Remove a dangling link
- **WHEN** Apply is clicked on a `remove` row for `Depends On` whose entry is `IAM-0099`, which no story holds, and the story still lists it
- **THEN** `IAM-0099` is removed from the story's `Depends On`, the story's other links are unchanged, and the row is `applied`

#### Scenario: Remove a link to a proposed story
- **WHEN** Apply is clicked on a `remove` row whose entry is `NEW-4` and the story still lists `NEW-4`
- **THEN** `NEW-4` is removed from the story's `Depends On` and the row is `applied`

#### Scenario: Removed entry became a real story
- **WHEN** a `remove` row names `IAM-0099`, a story now holds `IAM-0099`, and the story still lists it
- **THEN** Apply removes the link, as for any other entry

#### Scenario: Link already gone
- **WHEN** a `remove` row names an entry the story no longer lists
- **THEN** the row is stale

#### Scenario: Rows applied one at a time after a removal
- **WHEN** a story has open rows "remove AC12", "remove AC15", "replace AC16" and an `add`, and the user applies them one at a time starting with "remove AC12"
- **THEN** each later row is still current and acts on the criterion its `Current` text names, now numbered one or two lower, and no row becomes stale

#### Scenario: Criterion deleted by hand
- **WHEN** the user deletes AC2 by hand after the review was written and a `replace` row names "AC5" with the text of what is now AC4
- **THEN** Apply replaces that criterion, now AC4

#### Scenario: Same text twice
- **WHEN** a `remove` row's `Current` text matches two criteria and neither is in the position the row names
- **THEN** the row is stale and nothing is removed

### Requirement: Rows written through the tool name the story's Title
When the review writer is called through the `story-tools` server, each row SHALL carry `storyTitle`, the story's current Title, and a `Depends On` row SHALL carry `targetTitle`, the Title of the story named in `suggested`. A `Depends On` `remove` row whose entry no story holds (a code that does not exist, the story itself or a `NEW-<n>`) has no story to name and SHALL NOT need `targetTitle`; when a story does hold the code, `targetTitle` is required and checked as for an `add` row. The pairs SHALL be checked against the backlog as the `story-tools-mcp` capability describes, and a mismatch SHALL be reported without writing any row. The Titles are used only for this check: they SHALL NOT be stored, the review file's columns SHALL NOT change, and the portal SHALL read and apply the rows as before. When the script is run from the command line these keys are optional, and a Title that is given is checked.

#### Scenario: Row for a renumbered story
- **WHEN** a row names `IAM-0004` with `storyTitle` `Reset password by email` and the backlog has since been renumbered so that `IAM-0004` is another story
- **THEN** nothing is written and the message says what `IAM-0004` holds now and which story has the Title

#### Scenario: Dependency target checked
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0002` and `targetTitle` `Sign in`, and `IAM-0002` has another Title
- **THEN** nothing is written and the message names the row

#### Scenario: Removing a link whose code a story holds
- **WHEN** a `Depends On` `remove` row has `suggested` `IAM-0002`, a story holds `IAM-0002`, and the row has no `targetTitle`
- **THEN** nothing is written and the message says to add the Title

#### Scenario: Removing a link no story holds
- **WHEN** a `Depends On` `remove` row through the tool has `suggested` `IAM-0099`, no story holds `IAM-0099`, and the row has no `targetTitle`
- **THEN** the row is accepted

#### Scenario: Stored row unchanged
- **WHEN** a row with `storyTitle` is accepted
- **THEN** the review file holds the same columns and values as a row written without it

#### Scenario: Script from the command line
- **WHEN** the script is run with rows that have no `storyTitle`
- **THEN** they are written as before
