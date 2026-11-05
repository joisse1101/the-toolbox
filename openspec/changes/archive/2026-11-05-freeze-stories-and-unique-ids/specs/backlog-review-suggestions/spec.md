## ADDED Requirements
### Requirement: Suggestions on a frozen story cannot be applied
A field-edit suggestion for a frozen story SHALL be shown where it is shown for any story, marked as belonging to a frozen story, with Dismiss but without an enabled Apply. This applies to suggestions that already existed when the story was frozen. No control SHALL exist to unfreeze the story, so Apply stays disabled for good and its hint SHALL say that a frozen story cannot be edited. A split group that narrows a frozen story SHALL be treated the same way as a whole. A review run after the story is frozen SHALL NOT write new rows for it.

#### Scenario: Apply disabled
- **WHEN** a frozen story has an open `replace` row for its Title
- **THEN** the chip shows the suggestion, its Reason and Dismiss, and Apply is disabled with a hint that a frozen story cannot be edited

#### Scenario: Frozen after the review
- **WHEN** a story with an open suggestion is frozen by `jois-story-plan`
- **THEN** Apply on that suggestion becomes disabled and stays disabled

#### Scenario: Split group on a frozen story
- **WHEN** a split group narrows a frozen story
- **THEN** the group cannot be applied

### Requirement: Resolve clarification rows
A review file MAY hold rows that settle a question of a backlog story, written by `jois-story-propose` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications` and `Action` = `resolve`, no Group, and `Suggested` the note to add to Notes (non-empty, MAY have several lines, not starting with a `Q<n>:` or `A<n>:` label). The finding names the pair by its number in a `pair` key (a number, as the story read shows it); the writer SHALL fill `Current` with that pair's question text from the backlog, as it fills `Current` for a criterion, and the stored row finds its pair by that text afterwards, ignoring case and surrounding blank space. It SHALL reject a finding without `pair`, one whose `pair` does not exist, and one on a story whose Clarifications cell is free text. The pair MAY have an empty or a filled answer. **Apply** SHALL, in one edit, append `Suggested` to the story's Notes on a new line (as the whole Notes when empty) and remove the pair, the later pairs being renumbered; **Dismiss** leaves both unchanged. The row is **stale** when no pair has the question text any more, when the Clarifications cell is free text, or when Notes already contain the suggested text. A resolve row for a frozen story SHALL be rejected by the writer, as any row for a frozen story is, and Accept all SHALL apply a resolve row as it applies other rows.

#### Scenario: Apply resolves the pair
- **WHEN** the user applies an open resolve row on story `B1-IAM-0003` for the question "Who owns approvals?" with the note "Approvals are owned by Finance"
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

#### Scenario: Frozen story
- **WHEN** a resolve row targets a frozen story
- **THEN** the writer rejects it, as for any row on a frozen story

### Requirement: Review CSV file
A review of a backlog SHALL be stored as a CSV file in the `reviews` folder with the same file name as the backlog it reviews (for example `reviews/data-portal.csv` for `backlogs/data-portal.csv`). One row SHALL describe one field edit and SHALL have the columns `Story ID`, `Field`, `Action`, `Current`, `Suggested`, `Reason`, `Area`, `Confidence`, `Group` and `Status`.

- `Story ID` is the ID of the story the edit applies to, or `NEW-<n>` for a story to be created (see "Split suggestions").
- `Field` is one of `Epic`, `Feature`, `Title`, `User Story`, `Sprint points`, `Depends On`, `User Acceptance Criteria`, `Notes`. Priority is not a Field: reviews do not cover it.
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
- A value only the user can decide (for example a page size, a relevance threshold, missing Sprint points; never Priority): `replace` with a proposed default, `Confidence` = `confirm`.
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

### Requirement: Accept all applies every open suggestion of an area
The Review tab SHALL offer an **Accept all** button in its header, which applies the open suggestions of every Area section, and an **Accept all** button on each Area section, which applies only the open suggestions of that section. A button SHALL be disabled when its scope has no open suggestion. Before anything is applied the tool SHALL ask the user to confirm, saying how many suggestions will be applied; declining SHALL change nothing.

Accept all SHALL apply the eligible suggestions one after the other in the order the tab lists them, each against the backlog as the previous one left it, with the same effect as clicking Apply on each. A suggestion SHALL NOT be applied, and SHALL stay open and unchanged, when its story is frozen, when any of its rows has `Confidence` = `confirm`, or when it cannot be applied at that point (it is stale, or applying it would be refused, for example because it would close a dependency cycle). A split group SHALL count as one suggestion. A suggestion that cannot be applied SHALL NOT stop the run: the next one is still tried.

The backlog edits of one run and the `applied` status of the rows it applied SHALL be saved like those of a single Apply. When the run ends the tool SHALL say how many suggestions were applied and how many were left open, with the number left for each reason (frozen story, needs a check, could not be applied).

#### Scenario: Accept all in the header
- **WHEN** the Review tab has 5 open suggestions that are all eligible and the user clicks Accept all in the header and confirms
- **THEN** all 5 are applied to the backlog, their rows are `applied`, and the tool reports 5 applied and none left open

#### Scenario: Accept all for one Area
- **WHEN** the tab has open suggestions in Hierarchy and INVEST and the user clicks Accept all on the INVEST section and confirms
- **THEN** only the INVEST suggestions are applied and the Hierarchy ones stay open

#### Scenario: Confirm default skipped
- **WHEN** an open suggestion has `Confidence` = `confirm` and the user accepts all
- **THEN** it is not applied, it stays open, and the summary counts it as needing a check

#### Scenario: Frozen story skipped
- **WHEN** an open field-edit suggestion belongs to a frozen story and the user accepts all
- **THEN** it is not applied and stays open, and the summary counts it as a frozen story

#### Scenario: Suggestion that cannot be applied
- **WHEN** applying an earlier suggestion of the run makes a later one stale
- **THEN** the later one is not applied and stays open, and the suggestions after it are still applied

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** the backlog and the review file are unchanged

#### Scenario: Nothing eligible
- **WHEN** every open suggestion in the scope is skipped
- **THEN** nothing is applied and the summary says so, with the reasons

### Requirement: Clarification suggestion rows
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `jois-story-review` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. Both `jois-story-review` and `jois-story-propose` MAY write `resolve` rows (see "Resolve clarification rows"); `jois-story-review` writes one only for a question that the story's own text already answers. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion for a frozen story SHALL be rejected by the writer, as any row for a frozen story is.

#### Scenario: Apply a suggested question
- **WHEN** the user applies an open clarification suggestion on story `B1-IAM-0003`
- **THEN** `B1-IAM-0003` has a new question with an empty answer, the row is `applied`, and the story shows one more open question

#### Scenario: Already asked
- **WHEN** the story already has a question with the suggested text
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Frozen story
- **WHEN** a clarification suggestion targets a frozen story
- **THEN** the writer rejects it and writes nothing

#### Scenario: Review skill writes a resolve row
- **WHEN** `jois-story-review` finds that a story's Notes already state the answer to an open question
- **THEN** it may write a `resolve` row for that question, and the row is applied and shown like one written by `jois-story-propose`

### Requirement: Script validates review rows
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); names a story that is frozen; uses a Field, Action, Area or Confidence outside the allowed values (`unlock` is no longer an allowed Action); has an empty `Suggested`; uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `User Acceptance Criteria`, or `add` on a Field other than `Depends On` and `User Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or is a `Depends On` `add` row whose entry is not a story ID in the backlog, is the story itself, or is a `NEW-<n>` that is not in the same Group. A `Depends On` `remove` row SHALL be accepted when the story lists the entry in its `Depends On`, whether or not a story holds that entry, and SHALL be rejected when the story does not list it; the entry may be a code no story holds, the story's own code or a `NEW-<n>`. Each problem about a finding SHALL name the finding by its position in the input. When the input is not valid JSON, the script SHALL report the parser's message and the position of the failure. The script SHALL ignore any `Current` or `Status` the caller supplies.

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

#### Scenario: Row for a frozen story
- **WHEN** a batch has a `replace` row for a frozen story
- **THEN** the batch is rejected, naming the story and saying it is frozen, and nothing is written

#### Scenario: Unlock action refused
- **WHEN** a finding has `Action` = `unlock`
- **THEN** the batch is rejected as an unknown Action and nothing is written

#### Scenario: Remove a link to a story that does not exist
- **WHEN** `B1-IAM-0003` lists `B1-IAM-0099` in `Depends On`, no story holds `B1-IAM-0099`, and a `Depends On` `remove` row for `B1-IAM-0003` has `suggested` `B1-IAM-0099`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to the story itself
- **WHEN** `B1-IAM-0003` lists `B1-IAM-0003` in `Depends On` and a `remove` row for it has `suggested` `B1-IAM-0003`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to a proposed story
- **WHEN** `B1-IAM-0003` lists `NEW-4` in `Depends On` and a `remove` row for it has `suggested` `NEW-4`
- **THEN** the row is accepted and written, without a Group

#### Scenario: Remove a link the story does not list
- **WHEN** a `Depends On` `remove` row has `suggested` `B1-IAM-0099` and the story does not list it
- **THEN** the batch is rejected, saying the story does not depend on `B1-IAM-0099`

#### Scenario: Add keeps its checks
- **WHEN** a `Depends On` `add` row has `suggested` `B1-IAM-0099`, which no story holds, or the story's own code
- **THEN** the batch is rejected and nothing is written

## REMOVED Requirements
### Requirement: Unlock suggestion
**Reason**: Stories can no longer be unlocked. The lock is replaced by a frozen state that only `jois-story-plan` sets and that the portal can neither set nor clear, so there is nothing for an `unlock` row to do.
**Migration**: The review reports an objection to a frozen story in its report text only, as a suggestion to supersede the story. An `unlock` row already in a review file is read without error as a stale row that offers Dismiss only (see "Review CSV file").

### Requirement: Suggestions on a locked story cannot be applied
**Reason**: Replaced by "Suggestions on a frozen story cannot be applied", because the lock no longer exists and a frozen story cannot be unfrozen to make a suggestion applicable.
**Migration**: A suggestion for a story that is frozen is shown with Dismiss and a disabled Apply, permanently. Change the story with a superseding story instead.

### Requirement: Resolve clarification suggestions
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Review CSV
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Every finding yields a field edit
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Accept all in the Review tab
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Clarification suggestions
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Script validates findings
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.
