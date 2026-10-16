## MODIFIED Requirements

### Requirement: Suggestions in the story form
When the open backlog has a review file of the same name, the tool SHALL load it and show each `open` row next to the field it concerns on the story it names, as a chip showing the suggested value, the Reason, the Area and whether it is `confirm`, with Apply and Dismiss buttons. `confirm` rows SHALL be labelled as a default to check. Rows for fields without an input on the form (for example `Depends On`) SHALL appear in a suggestions list at the bottom of the form. Rows with `Status` `applied` or `dismissed` SHALL NOT be shown as open suggestions.

A `replace` suggestion SHALL show its value as a word-by-word comparison with the row's `Current` value: words only in the suggestion SHALL be highlighted, words only in `Current` SHALL be struck through, and unchanged words SHALL be plain. The comparison SHALL ignore differences in whitespace only. A `replace` row with an empty `Current`, and every other kind of row, SHALL show its value as plain text. The Review tab SHALL show the same comparison.

A `User Acceptance Criteria` `replace` or `remove` suggestion SHALL be shown directly under the criterion whose label (`AC<n>`) it names. An `add` suggestion, and a `replace` or `remove` whose criterion is not on the story, SHALL appear in the list below the criteria.

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

#### Scenario: Added criterion below the criteria
- **WHEN** a review has an open `add` row for User Acceptance Criteria
- **THEN** it is shown in the list below the criteria, not under any criterion

#### Scenario: Criterion no longer on the story
- **WHEN** an open `replace` row names "AC5" and the story has three criteria
- **THEN** the suggestion is shown in the list below the criteria as stale

#### Scenario: No review file
- **WHEN** the open backlog has no review file
- **THEN** the form shows no suggestions and no error
