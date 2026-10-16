## Why

A `replace` suggestion shows only the new text, so the reader has to compare it with the field by eye to find what changed ("i see each request" -> "i won't see each request"). Acceptance-criteria suggestions also sit in one pile under the criteria list, so the reader has to match the `AC<n>` label by hand.

## What Changes

- Show a `replace` suggestion's value as a word-level diff against `Current`: added words highlighted, removed words struck through. Applies to every field a `replace` row can name, in the story form and in the Review tab (same `Suggestion` component).
- In the story form, show each `User Acceptance Criteria` `replace` and `remove` suggestion directly under the criterion it names (`AC<n>`). `add` suggestions, and a suggestion whose criterion no longer exists, stay in the list below the criteria.
- Add a pure `wordDiff(old, new)` in `core/` with node tests.
- No change to the review CSV, the writer script, or the skills.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-review-suggestions`: the "Suggestions in the story form" requirement changes (criteria suggestions placed under their criterion; `replace` value shown as a word diff).

## Impact

- `core/` gets a new pure module (word diff) and a small helper that finds the criterion number a row names.
- `app/frontend/user-story-generator/components/Suggestions.jsx`, `StoryForm.jsx`, `tool.css`.
- New test file under `test/`. No dependencies added.
