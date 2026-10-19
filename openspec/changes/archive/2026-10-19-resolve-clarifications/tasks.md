## 1. Multi-line Notes in the proposal writer

- [x] 1.1 In `core/proposal-input.js`, drop the line-break check on `notes` (new stories and patches), normalise line endings to `\n` and trim; keep the check on every other field. Verify with new cases in `test/write-proposal.test.mjs`: two-line Notes accepted on a new story and a patch and stored with the newline; a Title with a line break still rejected.

## 2. Resolve in proposal patches

- [x] 2.1 Extend `checkClarifications` with `resolve: [{ n, note }]`: existing `n`, no duplicate `n`, no overlap with `answer`, non-empty `note` (may be multi-line), and count it in "changes nothing". Verify with tests for each rejection, naming the pair.
- [x] 2.2 Extend `applyPatch`: apply the patch's own `notes`, then resolve (append each note on a new line or as the whole Notes when empty, remove the pair), then `add`; free-text Clarifications and benched stories stay refused. Verify with tests: resolve a filled pair, an open pair, two pairs at once (renumbering), resolve together with `add` and with `notes`, and that a failing item writes nothing.
- [x] 2.3 Update the patch key list/messages that mention `{ add, answer }` so `resolve` appears, and confirm `check_drafts` reports the same errors as the writer (`test/story-tools-mcp.test.mjs`).

## 3. Resolve rows in the review

- [x] 3.1 In `core/review.js` add `resolve` to the actions for `Clarifications`, a `pair` key on findings, validation (pair exists, cell not free text, non-empty `Suggested` without a `Q<n>:`/`A<n>:` label, no Group, locked-story rule) and `fillCurrent` storing the question text in `Current`. Verify with tests in `test/review.test.mjs` and `test/write-review.test.mjs`, including a finding without `pair` and one with a pair that does not exist.
- [x] 3.2 Add `locatePair(story, row)` and `resolvePair(story, row)`; call `resolvePair` from both `editExisting` and `applySuggestions`; extend `suggestionState` (stale when the question is gone, matches several pairs, the cell is free text, or Notes already contain the note) and `displayRow` so the row reads as note added and question removed. Verify with reducer/review tests: Apply, Accept all, Apply after an earlier row removed a lower pair, stale cases, and a locked story.
- [x] 3.3 Confirm `review-backlog` cannot write `resolve` (its SKILL.md does not list it) and that `write_review`'s tool description lists the row with its rules, built from `core/review.js` exports. Verify with `test/story-tools-mcp.test.mjs`.

## 4. Skills, guideline and docs

- [x] 4.1 Add the resolve rule to `ai/guidelines/product-backlog.md` section 6 (resolve only an answer the user stated; compose the note as a decision; drop the question's wording when the answer carries it; Notes hold decisions). Verify the section reads consistently with the existing "do not bury it in Notes" line.
- [x] 4.2 Update `.claude/skills/propose-stories/SKILL.md` (and the `/story:propose` command text if it restates the patch keys): `resolve` in a patch, the `resolve` review row with `pair`, the draft showing the note and the removed question, multi-line Notes in the examples, and the read-back checks. Verify by re-reading the skill for any remaining "Pairs are never deleted" or "Notes on one line" wording.
- [x] 4.3 Update `CLAUDE.md` (the `write_proposals` and `write_review` paragraphs) and `README.md` if it mentions the clarification keys. Verify with a search for `{ "add"` and "one line".

## 5. Final check

- [x] 5.1 Run `npm test` and confirm all tests pass; run `openspec validate resolve-clarifications` and confirm it passes.
