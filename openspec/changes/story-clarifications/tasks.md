## 1. Core: Clarifications format and model

- [x] 1.1 Add parse/compose/open-count functions for `Q<n>:` / `A<n>:` text (multi-line answers, raw fallback) and verify with unit tests for round trip, empty answers, free text and renumbering
- [x] 1.2 Add `Clarifications` to `COLUMNS` and the story model (`clarifications`, `rawClarifications`), load and serialize it, and verify an older CSV gains the column on save and the cell round-trips unchanged
- [x] 1.3 Make accept in `core/proposals.js` refuse benched stories (single and Accept all, all-or-nothing) and stop clearing `benched`; verify with tests, including that open questions do not block and the cell is carried to the backlog and back on move-to-proposed

## 2. Portal

- [ ] 2.1 Add the Clarifications section to `StoryForm.jsx` (add, delete, edit question and answer) for the Editor and Proposed tabs; verify by hand that edits auto-save and reload
- [ ] 2.2 Show the "N open" badge in `StoryList.jsx` and disable Accept (selected and all) with a reason for benched stories in `ProposedTab.jsx`; verify by hand with a benched, an open and a cleared story
- [ ] 2.3 Show the `Clarification` Area in the Review tab and Apply for clarification suggestions in the story form, and verify by hand that Apply adds an open question and a duplicate shows as out of date
- [ ] 2.4 Run `npm run build` and `npm test` and verify both pass

## 3. Review support for clarification suggestions

- [x] 3.1 Extend `core/review.js` (field `Clarifications` with action `append`, area `Clarification`, apply, stale check, lock handling) and verify with tests for apply, duplicate, locked story and CSV round trip; verify `write-review.mjs` accepts and validates such rows (including with `--append`) and keeps existing rows

## 4. Clarify skill scripts

- [ ] 4.1 Write `clarify-stories/read-clarify-context.mjs` (guidelines, backlog, proposals including benched, labelled as data) and verify with a test that a benched story is printed here and still omitted by `read-story-context.mjs`, which prints `Clarifications` for unbenched stories
- [ ] 4.2 Write `clarify-stories/write-clarifications.mjs` (patches on `proposals/` only, patch fields plus add and answer clarifications, benched allowed and flag unchanged, all-or-nothing, unknown/duplicate/priority rejections, never overwrites an answer, never writes `user-stories/`) and verify with tests for each scenario in the spec
- [ ] 4.3 Verify `write-proposal.mjs` rejects a `clarifications` key in a new story and in a patch (add a test)
- [ ] 4.4 Write `clarify-stories/guard-bash.mjs` and `locked-settings.json` (including `claudeMdExcludes`) allowing only the clarify reader, `write-clarifications.mjs` and `write-review.mjs <backlog> --append`, and verify with tests that the explore, propose and review guards deny the clarify reader and writer, and the clarify guard denies `write-review.mjs` without `--append` and everything else

## 5. Skill and launcher

- [ ] 5.1 Write `clarify-stories/SKILL.md`: input via the clarify reader, elicitation-first stance, no repeats of existing questions, per-story preview with old and new values, `AskUserQuestion` yes/no before the writer, report; verify it says it works on proposed stories only, cannot create stories or set Priority, and names when to use `propose-stories` instead
- [ ] 5.2 Add `ai/launchers/clarify-stories.ps1` (backlog and optional story, tools Bash/Skill/AskUserQuestion) and verify it starts a session with the guard from `locked-settings.json`
- [ ] 5.3 Update `review-backlog` SKILL.md so an open question is a `Clarifications` append (Notes only for facts and decisions) and note that a run without `--append` replaces clarify suggestions; verify the SKILL.md table row and the writer's allowed fields match
- [ ] 5.4 Update `explore-stories` and `propose-stories` SKILL.md to say answered Clarifications inform refinement and are changed only through `clarify-stories` or the portal

## 6. Docs

- [ ] 6.1 Update CLAUDE.md (new column, benched gate, new scripts and launcher; skills still never write the backlog) and README, and verify no statement still says benched accepts as usual and that clarify suggestions and the review replace caveat are documented
