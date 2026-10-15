## 1. Core: Clarifications format and model

- [x] 1.1 Add parse/compose/open-count functions for `Q<n>:` / `A<n>:` text (multi-line answers, raw fallback) and verify with unit tests for round trip, empty answers, free text and renumbering
- [x] 1.2 Add `Clarifications` to `COLUMNS` and the story model (`clarifications`, `rawClarifications`), load and serialize it, and verify an older CSV gains the column on save and the cell round-trips unchanged
- [x] 1.3 Make accept in `core/proposals.js` refuse benched stories (single and Accept all, all-or-nothing) and stop clearing `benched`; verify with tests, including that open questions do not block and the cell is carried to the backlog and back on move-to-proposed

## 2. Portal

- [x] 2.1 Add the Clarifications section to `StoryForm.jsx` (add, delete, edit question and answer) for the Editor and Proposed tabs; verify by hand that edits auto-save and reload
- [x] 2.2 Show the "N open" badge in `StoryList.jsx` and disable Accept (selected and all) with a reason for benched stories in `ProposedTab.jsx`; verify by hand with a benched, an open and a cleared story
- [x] 2.3 Show the `Clarification` Area in the Review tab and Apply for clarification suggestions in the story form, and verify by hand that Apply adds an open question and a duplicate shows as out of date
- [x] 2.4 Run `npm run build` and `npm test` and verify both pass

## 3. Review support for clarification suggestions

- [x] 3.1 Extend `core/review.js` (field `Clarifications` with action `append`, area `Clarification`, apply, stale check, lock handling) and verify with tests for apply, duplicate, locked story and CSV round trip; verify `write-review.mjs` accepts and validates such rows (including with `--append`) and keeps existing rows

## 4. Clarify skill scripts

- [x] 4.1 Write `clarify-stories/read-clarify-context.mjs` (guidelines, backlog, proposals including benched, labelled as data) and verify with a test that a benched story is printed here and still omitted by `read-story-context.mjs`, which prints `Clarifications` for unbenched stories
- [x] 4.2 Remove `clarify-stories/read-clarify-context.mjs` and its test (built earlier, no longer needed); verify `read-story-context.mjs` still prints `Clarifications` for unbenched stories and omits benched ones

## 4b. Proposal writer

- [x] 4b.1 Extend `core/proposal-input.js` and `write-proposal.mjs` with `clarifications` (new story: questions; patch: add and answer on empty pairs only, no delete or overwrite, benched still refused); verify with tests for each scenario in the spec, including all-or-nothing

## 5. Skills and guidelines

- [x] 5.1 Add the best-effort-plus-questions section to `ai/guidelines/product-backlog.md`; verify it states: complete as far as facts allow, unknowns become questions, never guess, record stated answers
- [x] 5.2 Update `explore-stories` SKILL.md (ask for unknowns while discussing, cite the section) and `propose-stories` SKILL.md (write `clarifications` in drafts and patches, show them in the preview, cite the section); verify neither restates the rule and both say benched stories must be unbenched in the portal first
- [x] 5.3 Update `review-backlog` SKILL.md so an open question is a `Clarifications` append (Notes only for facts and decisions) and note that a run without `--append` replaces clarification suggestions; verify the SKILL.md table row and the writer's allowed fields match

## 6. Docs

- [x] 6.1 Update CLAUDE.md (new column, benched gate, `clarifications` in `write-proposal.mjs`; skills still never write the backlog) and README, and verify no statement still says benched accepts as usual and that clarify suggestions and the review replace caveat are documented
