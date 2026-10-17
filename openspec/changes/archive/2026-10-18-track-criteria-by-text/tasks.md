## 1. Lookup in core

- [x] 1.1 Add `locateCriterion(story, row)` to `core/review.js`: slot named by the label if its label-free text equals `row.current` (case and whitespace ignored), else the single criterion with that text, else `null`. Verify with unit tests for slot hit, moved criterion, no match and two identical criteria.
- [x] 1.2 Use it in `editState` for criterion `replace` and `remove`, with a stale reason that says whether the criterion was edited or ambiguous. Verify the existing stale tests in `test/review.test.mjs` still pass.
- [x] 1.3 Use it in `editExisting` for criterion `replace` and `remove`, falling back to the labelled slot when it finds nothing (rows of one unit edited in sequence). Verify `applySuggestions` tests for mixed units still pass.
- [x] 1.4 Change `criterionNumberOf(unit, story)` to return the located position. Update the existing `criterionNumberOf` test and verify it passes.

## 2. Form

- [x] 2.1 Pass the story to `criterionNumberOf` in `StoryForm.jsx` and drop the `n > s.criteria.length` check, since `null` now covers it. Verify with `npm run build` and, in the running portal, a story with a remove row after an earlier criterion was removed: the suggestion shows under the moved criterion.

## 3. Tests

- [x] 3.1 Add the DAM-0013 sequence to `test/review.test.mjs`: a story with 17 criteria and rows remove AC12, remove AC15, replace AC16, add; apply them one at a time through `applySuggestions` and verify the right three criteria change and none is stale.
- [x] 3.2 Add a test where a criterion is deleted by hand between review and apply, and a replace row still applies to the shifted criterion; add one where the criterion text was edited and the row is stale.
- [x] 3.3 Run `npm test` and verify all tests pass.

## 4. Docs

- [x] 4.1 Update the review paragraph in `CLAUDE.md` and the criterion-row rules in the `review-backlog` and `propose-stories` skill text if they tell the model to order rows by AC number. Verify with a search for "AC number" and "highest" in those files.

## 5. Labels

- [x] 5.1 Show criterion rows with the number their criterion has now (`displayRow` in `core/review.js`, used by `Suggestions.jsx`), an add with the number it will get. Verified by the `displayRow` test.
