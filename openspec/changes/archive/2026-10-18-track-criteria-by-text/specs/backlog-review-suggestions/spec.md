## MODIFIED Requirements

### Requirement: Applying a suggestion
Apply SHALL perform the edit through the same change path as a manual edit, so IDs, dependency links and autosave behave as for a manual edit: `replace` sets the field (for User Acceptance Criteria it replaces the matched criterion), `add` adds an acceptance criterion or a `Depends On` link, `remove` removes a `Depends On` link or the matched acceptance criterion (later criteria are renumbered), `append` adds the text to the end of Notes on a new line. After Apply the row's `Status` SHALL be `applied` in the review file. A `Depends On` change that would create a cycle or a link to a missing story SHALL NOT be applied and the user SHALL be told why.

A `User Acceptance Criteria` `replace` or `remove` row SHALL be matched to its criterion as follows: the criterion in the position named by the row's label (`AC<n>`) when its text equals the row's `Current`; otherwise the one criterion of the story whose text equals `Current`. The comparison SHALL ignore the `AC<n>:` label, case and whitespace, and SHALL NOT be approximate. When no criterion or more than one criterion matches, the row is stale. Applying a row SHALL NOT change which criterion any other open row matches, so open rows of one story can be applied one at a time in any order.

#### Scenario: Apply a replacement
- **WHEN** the user clicks Apply on a `replace` row for a story's Title
- **THEN** the Title becomes the suggested value, the backlog autosaves, and the row is `applied` in the review file

#### Scenario: Apply an added criterion
- **WHEN** the user clicks Apply on an `add` row for User Acceptance Criteria
- **THEN** a new criterion with the suggested Given, When and Then is added to the story and the criteria numbering stays sequential

#### Scenario: Dependency would create a cycle
- **WHEN** Apply on an `add` row for Depends On would close a dependency cycle
- **THEN** the backlog is unchanged, the row stays `open` and a message explains the reason

#### Scenario: Rows applied one at a time after a removal
- **WHEN** a story has open rows "remove AC12", "remove AC15", "replace AC16" and an `add`, and the user applies them one at a time starting with "remove AC12"
- **THEN** each later row is still current and acts on the criterion its `Current` text names, now numbered one or two lower, and no row becomes stale

#### Scenario: Criterion deleted by hand
- **WHEN** the user deletes AC2 by hand after the review was written and a `replace` row names "AC5" with the text of what is now AC4
- **THEN** Apply replaces that criterion, now AC4

#### Scenario: Same text twice
- **WHEN** a `remove` row's `Current` text matches two criteria and neither is in the position the row names
- **THEN** the row is stale and nothing is removed

### Requirement: Stale suggestions
A suggestion SHALL be stale when the live story no longer matches what the row expects: the field value differs from `Current` for `replace`, the criterion to replace or remove cannot be matched to exactly one criterion by its `Current` text (see "Applying a suggestion"), an `add`ed criterion or link already exists, a link to remove is absent, or the story is no longer found by its ID. A stale suggestion SHALL be shown as stale with its Reason and a Dismiss button, and SHALL NOT offer Apply.

#### Scenario: Field edited since the review
- **WHEN** the user edits a Title by hand after the review was written
- **THEN** the review row for that Title shows as stale and cannot be applied

#### Scenario: IDs changed
- **WHEN** a story moved to another Epic and was renumbered
- **THEN** rows naming its old ID show as stale instead of being applied to a different story

#### Scenario: Criterion edited since the review
- **WHEN** the user edits the text of the criterion a `replace` row targets
- **THEN** the row is stale, even if a criterion still sits in the position it names

### Requirement: Suggestions in the story form
When the open backlog has a review file of the same name, the tool SHALL load it and show each `open` row next to the field it concerns on the story it names, as a chip showing the suggested value, the Reason, the Area and whether it is `confirm`, with Apply and Dismiss buttons. `confirm` rows SHALL be labelled as a default to check. Rows for fields without an input on the form (for example `Depends On`) SHALL appear in a suggestions list at the bottom of the form. Rows with `Status` `applied` or `dismissed` SHALL NOT be shown as open suggestions.

A `replace` suggestion SHALL show its value as a word-by-word comparison with the row's `Current` value: words only in the suggestion SHALL be highlighted, words only in `Current` SHALL be struck through, and unchanged words SHALL be plain. The comparison SHALL ignore differences in whitespace only. A `replace` row with an empty `Current`, and every other kind of row, SHALL show its value as plain text. The Review tab SHALL show the same comparison.

A `User Acceptance Criteria` `replace` or `remove` suggestion SHALL be shown directly under the criterion it matches (see "Applying a suggestion"), which may carry a different number than the row's label. The `AC<n>` labels in a criterion suggestion, in its suggested text and its `Current` text, are generated numbers and SHALL be shown as the number the criterion has now (for an `add`, the number it will get); the stored row is not changed. An `add` suggestion, and a `replace` or `remove` whose criterion cannot be matched, SHALL appear in the list below the criteria.

#### Scenario: Suggestion beside the field
- **WHEN** a review has an open `replace` row for IAM-0001's User Story
- **THEN** the story form shows the suggested text, its reason and Apply and Dismiss beside the "So that" field

#### Scenario: Changed word highlighted
- **WHEN** a `replace` row has `Current` "AC1: Given a list, when I open it, then i see each request" and `Suggested` "AC1: Given a list, when I open it, then i won't see each request"
- **THEN** only "won't" is highlighted in the suggestion and the other words are plain

#### Scenario: Removed word struck through
- **WHEN** a `replace` row changes "then i see each request" to "then i see requests"
- **THEN** "each" is shown struck through and "requests" is highlighted

#### Scenario: Criterion suggestion under its criterion
- **WHEN** a review has an open `replace` row whose `Suggested` starts with "AC2:" and an open `remove` row for "AC3"
- **THEN** the first suggestion is shown under the second criterion and the second under the third criterion

#### Scenario: Suggestion follows its criterion after a renumber
- **WHEN** an open `remove` row names "AC3" and an earlier criterion has since been removed, so that criterion is now AC2
- **THEN** the suggestion is shown under the second criterion

#### Scenario: Labels show the current numbers
- **WHEN** the first of three open rows ("remove AC12", "remove AC15", "replace AC16") has been applied
- **THEN** the other two are shown as "AC14" and "AC15" in both the suggested text and the `Current` text, and an open `add` row is labelled with the number the new criterion will get

#### Scenario: Added criterion below the criteria
- **WHEN** a review has an open `add` row for User Acceptance Criteria
- **THEN** it is shown in the list below the criteria, not under any criterion

#### Scenario: Criterion no longer on the story
- **WHEN** an open `replace` row names "AC5" and no criterion of the story has the row's `Current` text
- **THEN** the suggestion is shown in the list below the criteria as stale

#### Scenario: No review file
- **WHEN** the open backlog has no review file
- **THEN** the form shows no suggestions and no error
