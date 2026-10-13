## 1. Review module (pure, shared by script and portal)

- [x] 1.1 Create `src/user-story-generator/review.js` with the review columns, allow-lists (Field, Action, Area, Confidence, Status), the Field x Action table, and `parseReview` / `serializeReview` (BOM, correct quoting); verify with round-trip tests in `test/review.test.mjs` including a value with a comma, quote and line break
- [x] 1.2 Add `validateFindings(findings, backlog)` that returns every problem (unknown Story ID, bad Field/Action/Area/Confidence, empty Suggested, Action not valid for Field, unparseable User Story or criterion, Sprint points off scale, add-story without Group/NEW id/Title, group not all `confirm`, bad Depends On entry); verify each spec "Script validates findings" scenario has a passing test
- [x] 1.3 Add `fillCurrent(rows, backlog)` (Current from the loaded backlog, empty for add/add-story, `AC<n>` match for criterion replace) and re-run merge that keeps Status of identical rows; verify with tests for "Current comes from the file" and "Re-run keeps decisions"
- [x] 1.4 Add `suggestionState(story, row)` (open or stale) and `applySuggestion(draft, row)` for every Field/Action pair; verify tests for each stale rule and for AC numbering staying sequential after add and replace

## 2. Write script

- [x] 2.1 Create `.claude/skills/review-backlog/write-review.mjs`: argument = backlog file name (reuse the `validateName` rules, must exist in `user-stories/`), findings JSON on stdin, output only to `reviews/<name>`; verify bad names (`..\x.csv`, missing file) exit non-zero and write nothing
- [x] 2.2 Implement validate, fill Current, merge Status, atomic write (temp file in `reviews/` then rename, create folder if missing, BOM on new file); verify a failed validation leaves an existing review file unchanged and a successful run leaves `user-stories/<name>` byte-identical
- [x] 2.3 Write `test/write-review.test.mjs` running the script against a temp copy of a sample backlog (valid input, unknown story, empty Suggested, all errors reported together, split group, multi-line value); verify `npm test` passes

## 3. Skill

- [x] 3.1 Update `.claude/skills/review-backlog/SKILL.md`: `allowed-tools: Read, Grep, Glob, Bash(node .claude/skills/review-backlog/write-review.mjs:*)`; replace "never edit any file" with the review-CSV-only rule; add the every-finding-yields-a-field-edit table and the split-group convention; add the findings JSON shape, the heredoc invocation, and "fix and re-run on errors"; keep the chat report and add a line naming the review file; verify by reading the file against the spec scenarios
- [x] 3.2 Run `/review-backlog data-portal.csv` end to end; verify `reviews/data-portal.csv` is created, every finding in the chat report has a row, and `user-stories/data-portal.csv` is unchanged (`git status` / file hash)

## 4. Server and storage

- [x] 4.1 Add `reviews` to `STORES` in `server.js` and `reviews/*` to `.gitignore`; verify `GET /api/reviews/files` lists the review file and a request for `../user-stories/data-portal.csv` is rejected
- [x] 4.2 Add `reviews` to the "Stores" description in `CLAUDE.md` and `README.md`; verify the text matches `STORES`

## 5. Portal

- [x] 5.1 Load the review file for the open backlog (same name, tolerate missing and invalid files with a message) and keep suggestions in state, keyed by story code; verify with the dev server that opening `data-portal.csv` loads its review and a backlog without one shows nothing
- [x] 5.2 Add the `applySuggestions` reducer action (single row or group, via `withStories` and `renumber`, cycle and missing-story checks for Depends On); extend `test/reducer.test.mjs` for replace, AC add/replace, Depends On add/remove/cycle, append, Epic change renumber, and a split group creating stories
- [x] 5.3 Render suggestion chips beside fields in `StoryForm.jsx` (value, Reason, Area, "check this default" label for `confirm`, Apply, Dismiss) and a bottom list for fields without an input; show stale rows with Dismiss only; verify in the browser against the generated `data-portal` review
- [x] 5.4 Show the open-suggestion count badge in `StoryList.jsx` and style chips and badge in `tool.css`; verify the badge drops on Apply and Dismiss
- [x] 5.5 Write Status back to `reviews/<name>` after Apply and Dismiss with retry when locked, without undoing the backlog edit; verify by applying a suggestion, reloading, and seeing it gone, and by holding the review file open in Excel to see the "could not yet be saved" message

## 6. Specs and wrap-up

- [x] 6.1 After `rename-story-hierarchy-and-add-review-skill` is archived, add a MODIFIED delta to the `backlog-review-skill` spec replacing "SHALL NOT modify the CSV or any other file" with "SHALL NOT modify the backlog CSV; writes only the review CSV through the script"; verify with `openspec validate add-review-suggestions`
- [x] 6.2 Run `npm test` and `npm run build`; verify both pass, then run `openspec validate add-review-suggestions`

## 7. Additions (Review tab, criterion remove, Priority, scope rule)

- [x] 7.1 Drop Priority from the allowed Fields in `review.js` and `SKILL.md`; verify a finding with Field Priority is rejected (`test/review.test.mjs`)
- [x] 7.2 Add `remove` on `Acceptance Criteria` (validation, Current, stale check, apply order, `SKILL.md` table); verify with tests for validation, Current, stale and apply ordering
- [x] 7.3 Add `reviewOverview` and `ReviewTab.jsx`, the Review tab button (only while a review file exists) and the out-of-date list; verify the overview tests and that `npm run build` succeeds
- [x] 7.4 Add the "rewording must not grow the story" rule to `SKILL.md` and the spec
- [x] 7.5 Verify in the browser: the Review tab lists suggestions by Area, a story link opens the editor, Apply and Dismiss work from the tab, and out-of-date entries offer only Dismiss; also apply the IAM-0003 AC4 remove
