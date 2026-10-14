## ADDED Requirements

### Requirement: Unlock suggestion
When the review has a strong objection to a locked story, it SHALL be written as one row with `Action` = `unlock` for that story: `Field`, `Current`, `Suggested` and `Group` empty, `Reason` = one sentence stating the objection, `Area` and `Confidence` as for any row. An `unlock` row SHALL be shown as a banner above the story in the story form reading that the review suggests unlocking and reviewing the story, with the Reason, an **Unlock** button and a **Dismiss** button; it SHALL also appear in the Review tab under its Area with the same two buttons. **Unlock** SHALL unlock the story, set the row to `applied`, change nothing else and be autosaved like any edit; the story is then reviewed by the next review run. **Dismiss** SHALL set the row to `dismissed` and leave the story locked. An `unlock` row SHALL be stale when its story is no longer found or is no longer locked, and then SHALL offer Dismiss only. The story list's suggestion badge SHALL count an open `unlock` row like any other suggestion.

#### Scenario: Banner on a locked story
- **WHEN** a review has an open `unlock` row for the locked story `IAM-0002`
- **THEN** the story form shows a banner with the Reason and Unlock and Dismiss above the story

#### Scenario: Unlock from the banner
- **WHEN** the user clicks Unlock on the banner
- **THEN** the story is unlocked and saved, the row is `applied`, and no other field of the story changed

#### Scenario: Dismiss keeps the lock
- **WHEN** the user clicks Dismiss on the banner
- **THEN** the story stays locked and the row is `dismissed`

#### Scenario: Unlocked by hand
- **WHEN** the user unlocks the story with the toggle while its `unlock` row is open
- **THEN** the row shows as stale with Dismiss only

### Requirement: Suggestions on a locked story cannot be applied
A field-edit suggestion (any row other than `unlock`) for a locked story SHALL be shown where it is shown for any story, marked as belonging to a locked story, with Dismiss but without an enabled Apply, until the story is unlocked. This applies to suggestions written for the story while it was locked and to suggestions that already existed when it was locked. A split group that narrows a locked story SHALL be treated the same way as a whole. Once the story is unlocked, the suggestion SHALL behave as for any story, including the staleness rules.

#### Scenario: Apply disabled
- **WHEN** a locked story has an open `replace` row for its Title
- **THEN** the chip shows the suggestion, its Reason and Dismiss, and Apply is disabled with a hint to unlock the story

#### Scenario: Locked after the review
- **WHEN** a story with an open suggestion is locked
- **THEN** Apply on that suggestion becomes disabled, and becomes available again after unlocking

#### Scenario: Split group on a locked story
- **WHEN** a split group narrows a locked story
- **THEN** the group cannot be applied until the story is unlocked

## MODIFIED Requirements

### Requirement: Review CSV
A review of a backlog SHALL be stored as a CSV file in the `reviews` folder with the same file name as the backlog it reviews (for example `reviews/data-portal.csv` for `user-stories/data-portal.csv`). One row SHALL describe one field edit, or one suggestion to unlock a story, and SHALL have the columns `Story ID`, `Field`, `Action`, `Current`, `Suggested`, `Reason`, `Area`, `Confidence`, `Group` and `Status`.

- `Story ID` is the ID of the story the edit applies to, or `NEW-<n>` for a story to be created (see "Split suggestions").
- `Field` is one of `Epic`, `Feature`, `Title`, `User Story`, `Sprint points`, `Depends On`, `Acceptance Criteria`, `Notes`, and is empty on an `unlock` row. Priority is not a Field: reviews do not cover it.
- `Action` is one of `replace`, `add`, `remove`, `append`, `add-story`, `unlock`.
- `Area` is one of `Hierarchy`, `INVEST`, `Acceptance criteria`.
- `Confidence` is `ready` (apply as-is) or `confirm` (a proposed default the user must check).
- `Status` is `open`, `applied` or `dismissed`; a new row is `open`.
- `Reason` is one sentence stating what is wrong.

#### Scenario: One row per edit
- **WHEN** a review finds a missing failure-path criterion on one story and a typo on another
- **THEN** the review CSV has two rows, each with its own Story ID, Field, Action and Reason

#### Scenario: Open in Excel
- **WHEN** the user opens a review CSV in Excel
- **THEN** it opens as UTF-8 with all columns readable

#### Scenario: Unlock row
- **WHEN** the review has a strong objection to the locked story `IAM-0002`
- **THEN** the review CSV has a row with Story ID `IAM-0002`, Action `unlock`, empty Field and Suggested, and the objection as Reason

### Requirement: Every finding yields a field edit
Every finding of a review about a story that is not locked SHALL produce at least one review row with a non-empty `Suggested` value; a finding SHALL NOT be left as advice only. A finding about a locked story SHALL be written as an `unlock` row (see "Unlock suggestion"), and MAY be accompanied by field-edit rows for that story as the evidence for it. The edit for each kind of finding SHALL be:

- Wording, typo or weak "so that": `replace` on the field.
- Missing or vague acceptance criterion: `add` or `replace` on `Acceptance Criteria`.
- Duplicate or unwanted acceptance criterion: `remove` on `Acceptance Criteria`, with `Suggested` = the label of the criterion (for example `AC4`).
- A value only the user can decide (for example a page size, a relevance threshold, missing Sprint points; never Priority): `replace` with a proposed default, `Confidence` = `confirm`.
- A story or feature in the wrong place: `replace` on `Epic` or `Feature`.
- A dependency problem: `add` or `remove` on `Depends On`.
- An open question (for example a single-story feature): `append` the question to `Notes`, `Confidence` = `confirm`.
- A story that is too large or covers several needs: a split group (see "Split suggestions").

#### Scenario: Value only the user can decide
- **WHEN** the review finds that a pagination criterion does not state the page size
- **THEN** it suggests a replacement criterion with a concrete page size and marks the row `confirm`

#### Scenario: Open question becomes a note
- **WHEN** the review finds a Feature with a single story
- **THEN** it suggests appending the question "split, merge or intended?" to that story's Notes and marks the row `confirm`

#### Scenario: Objection to a locked story
- **WHEN** the review finds a locked story far over the size limit
- **THEN** it writes an `unlock` row with the Reason and may add the split group as evidence

### Requirement: Script validates findings
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); uses a Field, Action, Area or Confidence outside the allowed values; has an empty `Suggested` (except an `unlock` row, which SHALL have an empty `Field` and `Suggested`); uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `Acceptance Criteria`, or `add` on a Field other than `Depends On` and `Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or suggests a `Depends On` entry that is not a story ID in the backlog or a `NEW-<n>` in the same Group. It SHALL also reject an `unlock` row for a story that is not locked, and a batch that leaves a field-edit row for a locked story without an `unlock` row for the same story in the resulting review file (an `unlock` row written by an earlier batch counts). Each problem about a finding SHALL name the finding by its position in the input. When the input is not valid JSON, the script SHALL report the parser's message and the position of the failure. The script SHALL ignore any `Current` or `Status` the caller supplies.

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
