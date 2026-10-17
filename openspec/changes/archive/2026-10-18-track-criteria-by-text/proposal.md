## Why

A `replace` or `remove` suggestion on a User Acceptance Criteria names its criterion by position (`AC15`). Applying one suggestion that removes a criterion renumbers every later criterion, so the other open rows of the same story point at the wrong slot, fail the `Current` check and become stale. In the DAM-0013 review, applying "remove AC12" made "remove AC15" and "replace AC16" stale although both criteria still existed. The same happens when the user deletes a criterion by hand between the review and the Apply.

## What Changes

- A `replace` or `remove` row on User Acceptance Criteria is resolved against the live story by the criterion's text, not only by its number. The row's `Current` already holds that text.
- Resolution: the criterion in slot `n` (the number in the row) is used when its text equals `Current`; otherwise the story's criteria are searched for exactly one whose text equals `Current`, and that one is used. Zero or several matches make the row stale.
- Text is compared without the `AC<n>:` label, ignoring case and whitespace. Exact match only, no fuzzy matching.
- Apply, the stale check and the placement of the suggestion under its criterion in the story form all use the resolved criterion, so a row follows its criterion to its new number.
- No change to the review CSV format, the writer scripts or the MCP tools, and no change to the apply order inside a unit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-review-suggestions`: how a criterion `replace` or `remove` row finds its criterion (placement in the form, Apply, stale check).

## Impact

- `core/review.js`: a shared lookup used by `editState`, `editExisting` and `criterionNumberOf` (which now also needs the story).
- `app/frontend/user-story-generator/components/StoryForm.jsx`: passes the story to `criterionNumberOf`.
- `test/review.test.mjs`: tests for the DAM-0013 sequence and a manual delete.
- No data migration; existing review files keep working.
