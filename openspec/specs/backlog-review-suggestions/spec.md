# backlog-review-suggestions Specification

## Purpose

Turns the findings of a backlog review into data the portal can use: a review CSV written only through a validating script, where every finding is a field edit, shown next to its field and in a Review tab, and applied or dismissed with one click.

## Requirements

### Requirement: Review CSV
A review of a backlog SHALL be stored as a CSV file in the `reviews` folder with the same file name as the backlog it reviews (for example `reviews/data-portal.csv` for `user-stories/data-portal.csv`). One row SHALL describe one field edit and SHALL have the columns `Story ID`, `Field`, `Action`, `Current`, `Suggested`, `Reason`, `Area`, `Confidence`, `Group` and `Status`.

- `Story ID` is the ID of the story the edit applies to, or `NEW-<n>` for a story to be created (see "Split suggestions").
- `Field` is one of `Epic`, `Feature`, `Title`, `User Story`, `Sprint points`, `Depends On`, `Acceptance Criteria`, `Notes`. Priority is not a Field: reviews do not cover it.
- `Action` is one of `replace`, `add`, `remove`, `append`, `add-story`.
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

### Requirement: Every finding yields a field edit
Every finding of a review SHALL produce at least one review row with a non-empty `Suggested` value; a finding SHALL NOT be left as advice only. The edit for each kind of finding SHALL be:

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

### Requirement: Suggestions do not grow the story
A suggested value SHALL stay within what the story already implies. It SHALL NOT add a capability, user group, permission or rule that the story does not contain. When a better value would need new scope, the review SHALL suggest a modest value and raise the larger idea as an `append` to `Notes` marked `confirm`.

#### Scenario: Benefit that would add scope
- **WHEN** a login story's "so that" restates its "I want" and the obvious fix mentions what the user is "entitled to see" (role-based access)
- **THEN** the suggested wording describes only identifying the user and letting them in, and role-based access is raised as a Notes question

### Requirement: Split suggestions
A split SHALL be written as a group of rows sharing one non-empty `Group` value and `Confidence` = `confirm`. The group SHALL narrow the original story with `replace` rows (for example Title, User Story, Sprint points) and SHALL create each new story with `add-story` rows whose `Story ID` is `NEW-<n>`, one row per field, including at least a `Title`. A new story SHALL take its Epic and Feature from the original story unless its rows set them.

#### Scenario: Splitting a 55-point story
- **WHEN** the review splits IAM-0005 into one narrowed story and two new stories
- **THEN** the review CSV has `replace` rows for IAM-0005 and `add-story` rows for `NEW-1` and `NEW-2`, all with the same Group

### Requirement: Single write path for reviews
The review skill SHALL write review files only by running the Node script `.claude/skills/review-backlog/write-review.mjs`, and the skill's tool permissions SHALL allow only that command to write. The skill SHALL NOT modify the backlog CSV or any file other than the review CSV. The script SHALL take the backlog file name as its argument and the findings as JSON on standard input, SHALL always write to `reviews/<backlog file name>` and SHALL NOT accept an output path.

#### Scenario: Backlog untouched
- **WHEN** a review is written for `data-portal.csv`
- **THEN** `user-stories/data-portal.csv` is byte-for-byte unchanged and `reviews/data-portal.csv` exists

#### Scenario: Bad file name
- **WHEN** the script is run with a backlog name such as `..\x.csv` or one that does not exist in `user-stories/`
- **THEN** it exits with an error and writes nothing

### Requirement: Script validates findings
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); uses a Field, Action, Area or Confidence outside the allowed values; has an empty `Suggested`; uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `Acceptance Criteria`, or `add` on a Field other than `Depends On` and `Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or suggests a `Depends On` entry that is not a story ID in the backlog or a `NEW-<n>` in the same Group. The script SHALL ignore any `Current` or `Status` the caller supplies.

#### Scenario: Unknown story
- **WHEN** a finding names `ZZ-0009`, which is not in the backlog
- **THEN** the script exits with an error naming `ZZ-0009` and no review file is created or changed

#### Scenario: Empty suggestion
- **WHEN** a finding has an empty `Suggested`
- **THEN** the script rejects it, because every finding must carry a field edit

#### Scenario: All problems reported together
- **WHEN** the input has an unknown Story ID and an invalid Action
- **THEN** the error output lists both

### Requirement: Script fills Current from the backlog
For each row the script SHALL set `Current` from the backlog as it was read: the story's current value for the Field on `replace`, `append`, and `Depends On` `add` or `remove`; the text of the criterion being replaced on an `Acceptance Criteria` `replace` (matched by the `AC<n>` label at the start of `Suggested`, which the script SHALL reject if no such criterion exists; a `remove` on `Acceptance Criteria` takes the label alone as `Suggested`, and `Current` is the text of that criterion); and empty for `add`, `add-story`, and rows for `NEW-<n>` stories. It SHALL use the same parsing as the portal so `Current` is exactly what the portal will compare against. Every written row SHALL have `Status` = `open`, except rows that keep a status from an earlier review (see "Safe, repeatable writes").

#### Scenario: Current comes from the file
- **WHEN** a finding replaces the User Story of IAM-0001 and the caller supplies a different `Current`
- **THEN** the written row's `Current` is the User Story text in the backlog

### Requirement: Safe, repeatable writes
The script SHALL write the review file atomically so that a failure never leaves a partly written file, SHALL quote CSV values correctly (commas, quotes and line breaks), and SHALL add a byte-order mark to a new file. When a review file already exists, the script SHALL replace its rows with the new findings, but a new row identical in Story ID, Field, Action and Suggested to an existing row SHALL keep that row's `Status`, so a re-run does not bring back suggestions the user already applied or dismissed.

#### Scenario: Multi-line value
- **WHEN** a suggested criterion contains a line break and a comma
- **THEN** reading the review CSV back returns the identical text

#### Scenario: Re-run keeps decisions
- **WHEN** a review is re-run and one finding is identical to a row marked `dismissed`
- **THEN** that row stays `dismissed` and new findings are `open`

### Requirement: Suggestions in the story form
When the open backlog has a review file of the same name, the tool SHALL load it and show each `open` row next to the field it concerns on the story it names, as a chip showing the suggested value, the Reason, the Area and whether it is `confirm`, with Apply and Dismiss buttons. `confirm` rows SHALL be labelled as a default to check. Rows for fields without an input on the form (for example `Depends On`) SHALL appear in a suggestions list at the bottom of the form. Rows with `Status` `applied` or `dismissed` SHALL NOT be shown as open suggestions.

#### Scenario: Suggestion beside the field
- **WHEN** a review has an open `replace` row for IAM-0001's User Story
- **THEN** the story form shows the suggested text, its reason and Apply and Dismiss beside the "So that" field

#### Scenario: No review file
- **WHEN** the open backlog has no review file
- **THEN** the form shows no suggestions and no error

### Requirement: Applying a suggestion
Apply SHALL perform the edit through the same change path as a manual edit, so IDs, dependency links and autosave behave as for a manual edit: `replace` sets the field (for Acceptance Criteria it replaces the matched criterion), `add` adds an acceptance criterion or a `Depends On` link, `remove` removes a `Depends On` link or the matched acceptance criterion (later criteria are renumbered), `append` adds the text to the end of Notes on a new line. After Apply the row's `Status` SHALL be `applied` in the review file. A `Depends On` change that would create a cycle or a link to a missing story SHALL NOT be applied and the user SHALL be told why.

#### Scenario: Apply a replacement
- **WHEN** the user clicks Apply on a `replace` row for a story's Title
- **THEN** the Title becomes the suggested value, the backlog autosaves, and the row is `applied` in the review file

#### Scenario: Apply an added criterion
- **WHEN** the user clicks Apply on an `add` row for Acceptance Criteria
- **THEN** a new criterion with the suggested Given, When and Then is added to the story and the criteria numbering stays sequential

#### Scenario: Dependency would create a cycle
- **WHEN** Apply on an `add` row for Depends On would close a dependency cycle
- **THEN** the backlog is unchanged, the row stays `open` and a message explains the reason

### Requirement: Stale suggestions
A suggestion SHALL be stale when the live story no longer matches what the row expects: the field value differs from `Current` for `replace`, the criterion to replace or remove is no longer present or no longer matches `Current`, an `add`ed criterion or link already exists, a link to remove is absent, or the story is no longer found by its ID. A stale suggestion SHALL be shown as stale with its Reason and a Dismiss button, and SHALL NOT offer Apply.

#### Scenario: Field edited since the review
- **WHEN** the user edits a Title by hand after the review was written
- **THEN** the review row for that Title shows as stale and cannot be applied

#### Scenario: IDs changed
- **WHEN** a story moved to another Epic and was renumbered
- **THEN** rows naming its old ID show as stale instead of being applied to a different story

### Requirement: Dismissing a suggestion
Dismiss SHALL set the row's `Status` to `dismissed` in the review file without changing the backlog.

#### Scenario: Dismiss
- **WHEN** the user clicks Dismiss
- **THEN** the chip disappears and the row is `dismissed` in the review file

### Requirement: Applying a split group
A group of rows SHALL be applied as one unit with a single Apply. Apply SHALL be offered only if every row in the group is current; otherwise the whole group shows as stale. Applying SHALL narrow the original story and create the new stories in one edit, and every row of the group SHALL then be `applied`. Dismiss on a group SHALL dismiss all its rows.

#### Scenario: Apply a split
- **WHEN** the user clicks Apply on a split group with two `add-story` stories
- **THEN** the original story is narrowed, two new stories exist with the suggested fields, and all rows of the group are `applied`

#### Scenario: One row of the group is stale
- **WHEN** the user edited the original story's Title after the review
- **THEN** the whole group shows as stale and nothing is applied

### Requirement: Suggestion count in the story list
Each story in the story list SHALL show the number of its open, non-stale suggestions when there are any.

#### Scenario: Badge
- **WHEN** a story has three open suggestions
- **THEN** its list row shows a badge with 3, and the badge decreases as suggestions are applied or dismissed

### Requirement: Review tab
The tool SHALL provide a Review tab, shown when the open backlog has a review file, that lists every suggestion of the review in one place: open suggestions grouped by Area (Hierarchy, INVEST, Acceptance criteria) and, within an Area, in backlog order. Each entry SHALL show the story's ID and Title (a link that opens the story in the editor), the Field, the suggested value, the Reason, whether it is a `confirm` default, and Apply and Dismiss with the same behaviour as in the story form. A split group SHALL appear once, under the story it narrows. Entries that are out of date, including those whose story no longer exists, SHALL appear in a separate "Out of date" section with Dismiss only. The tab SHALL show the count of open suggestions, and an empty state when there are none. There SHALL be no "apply all" action.

#### Scenario: Overview grouped by Area
- **WHEN** a review has suggestions in all three Areas
- **THEN** the Review tab shows three sections, each listing its suggestions with the story they concern

#### Scenario: Apply from the overview
- **WHEN** the user clicks Apply on an entry in the Review tab
- **THEN** the change is made exactly as from the story form and the entry leaves the open list

#### Scenario: Open the story
- **WHEN** the user clicks the story link of an entry
- **THEN** the Editor tab opens on that story

#### Scenario: Out-of-date entries
- **WHEN** a story was renumbered after the review
- **THEN** its entries appear under "Out of date" with Dismiss only

#### Scenario: No review
- **WHEN** the open backlog has no review file or no open suggestions
- **THEN** the Review tab says there is nothing to review

### Requirement: Review file errors do not block editing
If the review file cannot be read or is not valid, the tool SHALL show a message and SHALL keep the backlog editable. If the review file cannot be written when a suggestion's Status changes (for example it is open in Excel), the tool SHALL say so and retry as autosave does; the edit to the backlog SHALL NOT be undone.

#### Scenario: Review file locked
- **WHEN** the user clicks Apply while the review file is locked by Excel
- **THEN** the backlog edit is made and saved, and the tool reports that the review status could not yet be saved
