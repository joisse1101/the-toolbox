## ADDED Requirements

### Requirement: Clarification suggestions
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `review-backlog` or by `clarify-stories` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion on a locked story SHALL follow the lock rules of the other suggestions.

#### Scenario: Apply a suggested question
- **WHEN** the user applies an open clarification suggestion on story `IAM-0003`
- **THEN** `IAM-0003` has a new question with an empty answer, the row is `applied`, and the story shows one more open question

#### Scenario: Already asked
- **WHEN** the story already has a question with the suggested text
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Locked story
- **WHEN** the story is locked and the review has no open unlock row for it
- **THEN** Apply is disabled as for any suggestion on a locked story

## MODIFIED Requirements

### Requirement: Every finding yields a field edit
Every finding of a review about a story that is not locked SHALL produce at least one review row with a non-empty `Suggested` value; a finding SHALL NOT be left as advice only. A finding about a locked story SHALL be written as an `unlock` row (see "Unlock suggestion"), and MAY be accompanied by field-edit rows for that story as the evidence for it. The edit for each kind of finding SHALL be:

- Wording, typo or weak "so that": `replace` on the field.
- Missing or vague acceptance criterion: `add` or `replace` on `User Acceptance Criteria`.
- Duplicate or unwanted acceptance criterion: `remove` on `User Acceptance Criteria`, with `Suggested` = the label of the criterion (for example `AC4`).
- A value only the user can decide (for example a page size, a relevance threshold, missing Sprint points; never Priority): `replace` with a proposed default, `Confidence` = `confirm`.
- A story or feature in the wrong place: `replace` on `Epic` or `Feature`.
- A dependency problem: `add` or `remove` on `Depends On`.
- An open question (for example a single-story feature): `append` the question to `Clarifications` (see "Clarification suggestions"), `Confidence` = `confirm`. A fact or decision worth recording, as opposed to something awaiting an answer, MAY still be an `append` to `Notes`.
- A story that is too large or covers several needs: a split group (see "Split suggestions").

#### Scenario: Value only the user can decide
- **WHEN** the review finds that a pagination criterion does not state the page size
- **THEN** it suggests a replacement criterion with a concrete page size and marks the row `confirm`

#### Scenario: Open question becomes a note
- **WHEN** the review finds a Feature with a single story
- **THEN** it suggests appending the question "split, merge or intended?" to that story's Clarifications and marks the row `confirm`

#### Scenario: Objection to a locked story
- **WHEN** the review finds a locked story far over the size limit
- **THEN** it writes an `unlock` row with the Reason and may add the split group as evidence

### Requirement: Suggestions do not grow the story
A suggested value SHALL stay within what the story already implies. It SHALL NOT add a capability, user group, permission or rule that the story does not contain. When a better value would need new scope, the review SHALL suggest a modest value and raise the larger idea as an `append` to `Clarifications` marked `confirm`.

#### Scenario: Benefit that would add scope
- **WHEN** a login story's "so that" restates its "I want" and the obvious fix mentions what the user is "entitled to see" (role-based access)
- **THEN** the suggested wording describes only identifying the user and letting them in, and role-based access is raised as a Clarifications question
