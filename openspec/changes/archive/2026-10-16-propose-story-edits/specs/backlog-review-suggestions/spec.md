## MODIFIED Requirements

### Requirement: Single write path for reviews
Review files SHALL be written only by running the Node script `.claude/skills/review-backlog/write-review.mjs`. The `review-backlog` skill and the `propose-stories` skill (for edits to backlog stories) MAY run it, and each skill's tool permissions SHALL allow only that command to write review files. Neither skill SHALL modify the backlog CSV or any file other than the review CSV (`propose-stories` additionally writes `proposals/<backlog file name>` through its own writer). The script SHALL take the backlog file name as its argument, optionally followed by the flag `--append`, and the findings as JSON on standard input. It SHALL always write to `reviews/<backlog file name>` and SHALL NOT accept an output path or any other argument. When a command is refused, the refusal message SHALL list the command forms that are allowed.

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

#### Scenario: Edits written from a propose session
- **WHEN** `propose-stories` writes edits to backlog stories with `write-review.mjs data-portal.csv --append`
- **THEN** the rows are added after the existing rows of `reviews/data-portal.csv`, the rows already there are unchanged, and the portal shows the new rows as open suggestions
