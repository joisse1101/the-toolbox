## MODIFIED Requirements

### Requirement: Single write path for reviews
The review skill SHALL write review files only by running the Node script `.claude/skills/review-backlog/write-review.mjs`, and the skill's tool permissions SHALL allow only that command to write. The skill SHALL NOT modify the backlog CSV or any file other than the review CSV. The script SHALL take the backlog file name as its argument, optionally followed by the flag `--append`, and the findings as JSON on standard input. It SHALL always write to `reviews/<backlog file name>` and SHALL NOT accept an output path or any other argument. When a command is refused, the refusal message SHALL list the command forms that are allowed.

#### Scenario: Backlog untouched
- **WHEN** a review is written for `data-portal.csv`
- **THEN** `user-stories/data-portal.csv` is byte-for-byte unchanged and `reviews/data-portal.csv` exists

#### Scenario: Bad file name
- **WHEN** the script is run with a backlog name such as `..\x.csv` or one that does not exist in `user-stories/`
- **THEN** it exits with an error and writes nothing

#### Scenario: Append flag allowed
- **WHEN** the skill runs `write-review.mjs data-portal.csv --append` with findings on standard input
- **THEN** the command is permitted

#### Scenario: Other arguments refused
- **WHEN** the script or the skill's permission check is given an output path or any argument other than the file name and `--append`
- **THEN** it is refused and the message lists the allowed command forms

### Requirement: Script validates findings
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); uses a Field, Action, Area or Confidence outside the allowed values; has an empty `Suggested`; uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `Acceptance Criteria`, or `add` on a Field other than `Depends On` and `Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or suggests a `Depends On` entry that is not a story ID in the backlog or a `NEW-<n>` in the same Group. Each problem about a finding SHALL name the finding by its position in the input. When the input is not valid JSON, the script SHALL report the parser's message and the position of the failure. The script SHALL ignore any `Current` or `Status` the caller supplies.

#### Scenario: Unknown story
- **WHEN** a finding names `ZZ-0009`, which is not in the backlog
- **THEN** the script exits with an error naming `ZZ-0009` and no review file is created or changed

#### Scenario: Empty suggestion
- **WHEN** a finding has an empty `Suggested`
- **THEN** the script rejects it, because every finding must carry a field edit

#### Scenario: All problems reported together
- **WHEN** the input has an unknown Story ID and an invalid Action
- **THEN** the error output lists both

#### Scenario: Malformed JSON
- **WHEN** the input has a missing comma after the 3rd finding
- **THEN** the error includes the JSON parser's message and the position it reports, and nothing is written

### Requirement: Safe, repeatable writes
The script SHALL write the review file atomically so that a failure never leaves a partly written file, SHALL quote CSV values correctly (commas, quotes and line breaks), and SHALL add a byte-order mark to a new file. Without `--append`, when a review file already exists, the script SHALL replace its rows with the new findings, but a new row identical in Story ID, Field, Action and Suggested to an existing row SHALL keep that row's `Status`, so a re-run does not bring back suggestions the user already applied or dismissed.

With `--append`, the script SHALL validate the batch on its own against the backlog, add its rows after the rows already in the review file, and create the file if it does not exist. A row in an appended batch that is identical in Story ID, Field, Action and Suggested to a row decided in the review before the current run (`applied` or `dismissed`) SHALL keep that status, so a review written as several batches keeps earlier decisions exactly as a single-batch review does. A batch that uses a Group name already present in the review file SHALL be rejected, so a split group is never divided across batches.

#### Scenario: Multi-line value
- **WHEN** a suggested criterion contains a line break and a comma
- **THEN** reading the review CSV back returns the identical text

#### Scenario: Re-run keeps decisions
- **WHEN** a review is re-run and one finding is identical to a row marked `dismissed`
- **THEN** that row stays `dismissed` and new findings are `open`

#### Scenario: Review written in batches
- **WHEN** a review is written as a first batch of 10 findings followed by two `--append` batches of 10 findings each
- **THEN** the review file holds all 30 rows and the backlog CSV is unchanged

#### Scenario: Decisions survive batches
- **WHEN** an earlier review had a `dismissed` row and the new run writes an identical finding in a later `--append` batch
- **THEN** that row is `dismissed` in the written file

#### Scenario: Invalid batch leaves earlier batches
- **WHEN** the second of three batches is invalid
- **THEN** it is rejected with its problems, the rows from the first batch remain, and the third batch can still be appended

#### Scenario: Group split across batches
- **WHEN** an `--append` batch uses a Group name that is already in the review file
- **THEN** the batch is rejected and nothing is written
