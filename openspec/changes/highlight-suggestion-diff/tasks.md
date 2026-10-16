## 1. Word diff (core)

- [x] 1.1 Add `core/word-diff.js` exporting `wordDiff(old, new)` -> `[{ text, kind }]` (`same`/`added`/`removed`, whitespace-insensitive equality), and verify with `test/word-diff.test.mjs`: one inserted word ("i see" -> "i won't see") marks only that word `added`, a deleted word is `removed`, identical text is all `same`, empty old/new work, and joining the non-`removed` parts gives back the new text.
- [x] 1.2 Add a pure helper in `core/review.js` returning the criterion number a unit names (ungrouped `replace`/`remove` on `User Acceptance Criteria`, else `null`), and verify with new cases in `test/review.test.mjs` (replace label, remove label, add -> null, other field -> null, grouped -> null).

## 2. Suggestion rendering

- [x] 2.1 In `Suggestions.jsx`, render a `replace` row with a non-empty `current` as the word diff (`<mark>` added, `<del>` removed) inside `suggestion-value`; other rows unchanged. Verify with `npm run build` succeeding and, in the browser, a Title/User Story/criterion `replace` showing highlighted words in both the editor and the Review tab.
- [x] 2.2 Add `mark`/`del` styles for `.suggestion-value` to `tool.css` using existing color variables; verify in the browser in light and dark themes.

## 3. Criteria placement (story form)

- [x] 3.1 In `StoryForm.jsx`, render the `SuggestionList` of the units for criterion `i+1` under each criterion row (full-width under the fields) and keep the remaining criteria units (adds, out-of-range numbers, grouped) in the list below the criteria; verify with `npm run build` and in the browser: `replace`/`remove` appear under their `AC<n>`, `add` and an out-of-range AC appear below.
- [x] 3.2 Run `npm test` and verify the whole suite passes.
