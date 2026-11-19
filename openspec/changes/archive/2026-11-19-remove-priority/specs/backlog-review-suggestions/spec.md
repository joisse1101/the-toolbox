## MODIFIED Requirements

### Requirement: Review CSV file
A review of a backlog SHALL be stored as a CSV file in the `reviews` folder with the same file name as the backlog it reviews (for example `reviews/data-portal.csv` for `backlogs/data-portal.csv`). One row SHALL describe one field edit and SHALL have the columns `Story ID`, `Field`, `Action`, `Current`, `Suggested`, `Reason`, `Area`, `Confidence`, `Group` and `Status`.

- `Story ID` is the ID of the story the edit applies to, or `NEW-<n>` for a story to be created (see "Split suggestions").
- `Field` is one of `Epic`, `Feature`, `Title`, `User Story`, `Sprint points`, `Depends On`, `User Acceptance Criteria`, `Notes`.
- `Action` is one of `replace`, `add`, `remove`, `append`, `add-story`.
- `Area` is one of `Hierarchy`, `INVEST`, `Acceptance criteria`.
- `Confidence` is `ready` (apply as-is) or `confirm` (a proposed default the user must check).
- `Status` is `open`, `applied` or `dismissed`; a new row is `open`.
- `Reason` is one sentence stating what is wrong.

A row with `Action` = `unlock`, written by a version that had story locks, SHALL be read without error as a stale row that offers Dismiss only and is never applied.

#### Scenario: One row per edit
- **WHEN** a review finds a missing failure-path criterion on one story and a typo on another
- **THEN** the review CSV has two rows, each with its own Story ID, Field, Action and Reason

#### Scenario: Open in Excel
- **WHEN** the user opens a review CSV in Excel
- **THEN** it opens as UTF-8 with all columns readable

#### Scenario: Old unlock row
- **WHEN** a review file written before this change holds an open `unlock` row
- **THEN** the file loads without error, the row is shown as out of date with Dismiss only, and Accept all leaves it open

### Requirement: Every finding yields a field edit row
Every finding of a review about a story that is not frozen SHALL produce at least one review row with a non-empty `Suggested` value; a finding SHALL NOT be left as advice only. A finding about a frozen story SHALL NOT be written as a row: it SHALL be reported in the report text as a suggestion to supersede the story (see the `backlog-review-skill` capability). The edit for each kind of finding SHALL be:

- Wording, typo or weak "so that": `replace` on the field.
- Missing or vague acceptance criterion: `add` or `replace` on `User Acceptance Criteria`.
- Duplicate or unwanted acceptance criterion: `remove` on `User Acceptance Criteria`, with `Suggested` = the label of the criterion (for example `AC4`).
- A value only the user can decide (for example a page size, a relevance threshold, missing Sprint points): `replace` with a proposed default, `Confidence` = `confirm`.
- A story or feature in the wrong place: `replace` on `Epic` or `Feature`.
- A dependency problem: `add` or `remove` on `Depends On`.
- An open question (for example a single-story feature): `append` the question to `Clarifications` (see "Clarification suggestion rows"), `Confidence` = `confirm`. A fact or decision worth recording, as opposed to something awaiting an answer, MAY still be an `append` to `Notes`.
- A story that is too large or covers several needs: a split group (see "Split suggestions").

#### Scenario: Value only the user can decide
- **WHEN** the review finds that a pagination criterion does not state the page size
- **THEN** it suggests a replacement criterion with a concrete page size and marks the row `confirm`

#### Scenario: Open question becomes a note
- **WHEN** the review finds a Feature with a single story
- **THEN** it suggests appending the question "split, merge or intended?" to that story's Clarifications and marks the row `confirm`

#### Scenario: Objection to a frozen story
- **WHEN** the review finds a frozen story far over the size limit
- **THEN** it writes no row for it and the report suggests superseding the story
