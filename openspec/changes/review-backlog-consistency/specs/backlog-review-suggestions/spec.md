## ADDED Requirements

### Requirement: Consistency area
`Consistency` SHALL be added to the allowed Areas, with `Hierarchy`, `INVEST`, `Acceptance criteria` and `Clarification`. A row with Area `Consistency` MAY have any Field and Action that the Field/Action rules allow. The writer SHALL accept it and reject an Area outside the list, naming the allowed ones. The Review tab SHALL list `Consistency` as a section after the other Areas, with its own Accept all button and the same open, applied and dismissed handling as every other Area. An Area section with no suggestions SHALL NOT be shown. Existing review files without Consistency rows SHALL load unchanged.

#### Scenario: Writer accepts Consistency
- **WHEN** a finding has Area `Consistency`
- **THEN** the writer accepts it, and a finding with Area `Cohesion` is rejected with the allowed Areas listed

#### Scenario: Review tab section
- **WHEN** a review has open `Consistency` rows
- **THEN** the Review tab shows a `Consistency` section with those rows and an Accept all button for it

#### Scenario: Old review file
- **WHEN** a review file has no `Consistency` rows
- **THEN** it loads as before and the tab shows no Consistency section

## MODIFIED Requirements

### Requirement: Clarification suggestions
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `review-backlog` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. Both `review-backlog` and `propose-stories` MAY write `resolve` rows (see "Resolve clarification suggestions"); `review-backlog` writes one only for a question that the story's own text already answers. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion on a locked story SHALL follow the lock rules of the other suggestions.

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
- **WHEN** `review-backlog` finds that a story's Notes already state the answer to an open question
- **THEN** it may write a `resolve` row for that question, and the row is applied and shown like one written by `propose-stories`
