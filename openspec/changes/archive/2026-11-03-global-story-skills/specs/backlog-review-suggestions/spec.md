# Spec Delta

## MODIFIED Requirements

### Requirement: Single write path for reviews
Review files SHALL be written only by running the writer script `write-review.mjs` that ships with the `jois-story-review` skill, with Bash. The `jois-story-review` skill and the `jois-story-propose` skill (for edits to backlog stories) MAY run it. Neither skill SHALL modify the backlog CSV or any file other than the review CSV (`jois-story-propose` additionally writes the backlog's proposals file through its own writer). The script SHALL take the backlog name as its argument, optionally followed by the flag `--append` or the flag `--check`, and the findings as JSON on standard input. It SHALL always write to `<backlog>/user-stories/review.csv` in the data folder and SHALL NOT accept an output path or any other argument. With `--check` it SHALL validate the findings exactly as for a write, report the result and write nothing. When it is run with any other argument it SHALL refuse and its message SHALL list the allowed command forms.

#### Scenario: Backlog untouched
- **WHEN** a review is written for the backlog `data-portal`
- **THEN** `data-portal/user-stories.csv` is byte-for-byte unchanged and `data-portal/user-stories/review.csv` exists

#### Scenario: Bad file name
- **WHEN** the script is run with a backlog name such as `..\x` or one that does not exist in the data folder
- **THEN** it exits with an error and writes nothing

#### Scenario: Append flag allowed
- **WHEN** the skill runs `write-review.mjs data-portal --append` with findings on standard input
- **THEN** the command is accepted

#### Scenario: Check writes nothing
- **WHEN** the skill runs `write-review.mjs data-portal --check` with valid findings on standard input
- **THEN** the script reports that the findings are valid and no file changes

#### Scenario: Other arguments refused
- **WHEN** the script is given an output path or any argument other than the backlog name, `--append` and `--check`
- **THEN** it is refused and the message lists the allowed command forms

#### Scenario: Edits written from a propose session
- **WHEN** `jois-story-propose` writes edits to backlog stories with `write-review.mjs data-portal --append`
- **THEN** the rows are added after the existing rows of `data-portal/user-stories/review.csv`, the rows already there are unchanged, and the portal shows the new rows as open suggestions

### Requirement: Rows written through the tool name the story's Title
When a story skill runs the review writer, each row SHALL carry `storyTitle`, the story's current Title, and a `Depends On` row SHALL carry `targetTitle`, the Title of the story named in `suggested`. A `Depends On` `remove` row whose entry no story holds (a code that does not exist, the story itself or a `NEW-<n>`) has no story to name and SHALL NOT need `targetTitle`; when a story does hold the code, `targetTitle` is required and checked as for an `add` row. The pairs SHALL be checked against the backlog, and a mismatch SHALL be reported without writing any row, saying what the ID holds now and which stories have the Title. The Titles are used only for this check: they SHALL NOT be stored, the review file's columns SHALL NOT change, and the portal SHALL read and apply the rows as before. When the script is run by hand without the Titles, rows without them SHALL be accepted as before and a Title that is given SHALL be checked.

#### Scenario: Row for a renumbered story
- **WHEN** a row names `IAM-0004` with `storyTitle` `Reset password by email` and the backlog has since been renumbered so that `IAM-0004` is another story
- **THEN** nothing is written and the message says what `IAM-0004` holds now and which story has the Title

#### Scenario: Dependency target checked
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0002` and `targetTitle` `Sign in`, and `IAM-0002` has another Title
- **THEN** nothing is written and the message names the row

#### Scenario: Removing a link whose code a story holds
- **WHEN** a story skill runs the writer with a `Depends On` `remove` row that has `suggested` `IAM-0002`, a story holds `IAM-0002`, and the row has no `targetTitle`
- **THEN** nothing is written and the message says to add the Title

#### Scenario: Removing a link no story holds
- **WHEN** a story skill runs the writer with a `Depends On` `remove` row that has `suggested` `IAM-0099`, no story holds `IAM-0099`, and the row has no `targetTitle`
- **THEN** the row is accepted

#### Scenario: Stored row unchanged
- **WHEN** a row with `storyTitle` is accepted
- **THEN** the review file holds the same columns and values as a row written without it

#### Scenario: Script from the command line
- **WHEN** the script is run by hand with rows that have no `storyTitle`
- **THEN** they are written as before

### Requirement: Clarification suggestions
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `jois-story-review` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. Both `jois-story-review` and `jois-story-propose` MAY write `resolve` rows (see "Resolve clarification suggestions"); `jois-story-review` writes one only for a question that the story's own text already answers. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion on a locked story SHALL follow the lock rules of the other suggestions.

#### Scenario: Apply a suggested question
- **WHEN** the user applies an open clarification suggestion on story `IAM-0003`
- **THEN** `IAM-0003` has a new question with an empty answer, the row is `applied`, and the story shows one more open question

#### Scenario: Already asked
- **WHEN** the story already has a question with the suggested text
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Locked story
- **WHEN** the story is locked and the review has no open unlock row for it
- **THEN** Apply is disabled as for any suggestion on a locked story

#### Scenario: Review skill writes a resolve row
- **WHEN** `jois-story-review` finds that a story's Notes already state the answer to an open question
- **THEN** it may write a `resolve` row for that question, and the row is applied and shown like one written by `jois-story-propose`

### Requirement: Resolve clarification suggestions
A review file MAY hold rows that settle a question of a backlog story, written by `jois-story-propose` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications` and `Action` = `resolve`, no Group, and `Suggested` the note to add to Notes (non-empty, MAY have several lines, not starting with a `Q<n>:` or `A<n>:` label). The finding names the pair by its number in a `pair` key (a number, as the story read shows it); the writer SHALL fill `Current` with that pair's question text from the backlog, as it fills `Current` for a criterion, and the stored row finds its pair by that text afterwards, ignoring case and surrounding blank space. It SHALL reject a finding without `pair`, one whose `pair` does not exist, and one on a story whose Clarifications cell is free text. The pair MAY have an empty or a filled answer. **Apply** SHALL, in one edit, append `Suggested` to the story's Notes on a new line (as the whole Notes when empty) and remove the pair, the later pairs being renumbered; **Dismiss** leaves both unchanged. The row is **stale** when no pair has the question text any more, when the Clarifications cell is free text, or when Notes already contain the suggested text. A resolve row on a locked story SHALL follow the lock rules of the other field edits, and Accept all SHALL apply it as it applies other rows.

#### Scenario: Apply resolves the pair
- **WHEN** the user applies an open resolve row on story `IAM-0003` for the question "Who owns approvals?" with the note "Approvals are owned by Finance"
- **THEN** the story's Notes end with that line, the question is gone from its Clarifications, and the "N open" badge drops by one if it was open

#### Scenario: Pair found after another row
- **WHEN** an earlier applied row removed pair 1, so the question is now pair 1 instead of 2
- **THEN** the row still finds the pair by its question text

#### Scenario: Question gone
- **WHEN** the question was deleted in the editor after the row was written
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Notes already hold the decision
- **WHEN** Notes already contain the suggested text
- **THEN** the row is stale, and Dismiss is available

#### Scenario: Locked story
- **WHEN** a resolve row targets a locked story and the review has no `unlock` row for it
- **THEN** the writer rejects it, as for any field edit on a locked story
