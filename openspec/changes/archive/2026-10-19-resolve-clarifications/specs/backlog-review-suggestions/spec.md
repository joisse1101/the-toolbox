## MODIFIED Requirements

### Requirement: Clarification suggestions
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `review-backlog` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. `review-backlog` writes `append` rows only; the `resolve` action (see "Resolve clarification suggestions") is written by `propose-stories`. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion on a locked story SHALL follow the lock rules of the other suggestions.

#### Scenario: Apply a suggested question
- **WHEN** the user applies an open clarification suggestion on story `IAM-0003`
- **THEN** `IAM-0003` has a new question with an empty answer, the row is `applied`, and the story shows one more open question

#### Scenario: Already asked
- **WHEN** the story already has a question with the suggested text
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Locked story
- **WHEN** the story is locked and the review has no open unlock row for it
- **THEN** Apply is disabled as for any suggestion on a locked story

## ADDED Requirements

### Requirement: Resolve clarification suggestions
A review file MAY hold rows that settle a question of a backlog story, written by `propose-stories` through `write_review`. Such a row SHALL have `Field` = `Clarifications` and `Action` = `resolve`, no Group, and `Suggested` the note to add to Notes (non-empty, MAY have several lines, not starting with a `Q<n>:` or `A<n>:` label). The finding names the pair by its number in a `pair` key (a number, as the story read shows it); the writer SHALL fill `Current` with that pair's question text from the backlog, as it fills `Current` for a criterion, and the stored row finds its pair by that text afterwards, ignoring case and surrounding blank space. It SHALL reject a finding without `pair`, one whose `pair` does not exist, and one on a story whose Clarifications cell is free text. The pair MAY have an empty or a filled answer. **Apply** SHALL, in one edit, append `Suggested` to the story's Notes on a new line (as the whole Notes when empty) and remove the pair, the later pairs being renumbered; **Dismiss** leaves both unchanged. The row is **stale** when no pair has the question text any more, when the Clarifications cell is free text, or when Notes already contain the suggested text. A resolve row on a locked story SHALL follow the lock rules of the other field edits, and Accept all SHALL apply it as it applies other rows.

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
