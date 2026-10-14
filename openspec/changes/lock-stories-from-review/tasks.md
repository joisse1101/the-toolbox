## 1. Model and CSV

- [x] 1.1 Add `Locked` to `COLUMNS` in `core/model.js`, a `locked` field on `newStory`, load `Yes` (trimmed, case-insensitive) only for stories that have an ID, and write `Yes`/empty in `serializeBacklog`; tests in `test/model.test.mjs` (round trip, older file gains the column on save, `Yes` without an ID loads unlocked, junk value loads unlocked)

## 2. ID rules (`core/ids.js`)

- [x] 2.1 `renumber`: locked stories with a unique, well-formed code are fixed points; epics with a locked story keep the code's prefix (first claim wins, taken first); unlocked stories take the lowest unreserved number in row order; dependency remap leaves locked codes alone; verify with new tests in `test/ids.test.mjs` for gap numbering, delete above a locked story, new story around a locked one, equal initials after epic reorder, duplicate locked codes demoted, links to a locked story surviving
- [x] 2.2 Guards: `moveStory`, `removeStory`, `commitEpic`/`commitEpics` return the stories unchanged (or skip the locked ones) when the target story is locked; `applyBulk` in `core/model.js` skips Epic changes on locked stories and returns `{ changed, skipped }`; tests for each guard and for Priority/Feature still applying to locked stories
- [x] 2.3 `core/proposals.js`: `moveToProposed` refuses a locked story (with a reason); `acceptProposed` produces unlocked stories; tests in `test/proposals.test.mjs`
- [x] 2.4 Lock helpers `lockStories(stories, ids)` / `unlockStories(stories, ids)` returning the new list and a count of skipped (no ID) stories; tests

## 3. Review core (`core/review.js`)

- [x] 3.1 Add `unlock` to `ACTIONS`; validation in `validateFindings` (empty Field and Suggested, story must exist and be locked); `fillCurrent` leaves Current empty; `parseReview`/`serializeReview` round-trip it; tests in `test/review.test.mjs`
- [x] 3.2 `validateFindings` takes the rows already in the review file and rejects field-edit rows (including split groups narrowing a locked story) for a locked story without an `unlock` row in the batch or the file; tests for same batch, earlier batch via `--append`, and replacing write ignoring old rows
- [x] 3.3 `suggestionState`/`unitState`: new `locked` state for open, current field-edit rows and groups of a locked story; `unlock` rows current while the story exists and is locked, stale otherwise; `openCounts` and `reviewOverview` include them; `applySuggestions` refuses locked rows; tests

## 4. Skill scripts

- [x] 4.1 `read-backlog.mjs`: print the scope line `N of M stories submitted for review, K locked (reference only)` between the guidelines and the CSV, omit it if the CSV cannot be parsed; tests in a new `test/read-backlog.test.mjs` (counts, no locked, unparseable)
- [x] 4.2 `write-review.mjs`: pass the existing review rows for `--append` to validation; tests in `test/write-review.test.mjs` (unlock accepted, unlock for unlocked story rejected, field edit without unlock rejected, unlock from an earlier batch accepted)
- [x] 4.3 `SKILL.md` of `review-backlog`: describe the scope line, "do not review locked stories", the `unlock` row (add to the findings table and the JSON key list: Field and Suggested empty), the evidence rows, the report summary and the "Suggestions to unlock" list; check `guard-bash.mjs` still allows the same command forms

## 5. Editor UI (`app/frontend/user-story-generator/`)

- [x] 5.1 `useBacklog.js` reducer: `LOCK` / `UNLOCK` / `LOCK_SELECTED` / `UNLOCK_SELECTED` actions; guards from 2.2 surfaced as messages; reducer tests in `test/reducer.test.mjs`
- [x] 5.2 `StoryForm.jsx`: lock toggle in the header row (disabled without an ID, with a hint), Epic input read-only while locked, Move to Proposed disabled while locked, delete refused with a message
- [x] 5.3 `StoryList.jsx` and `StoriesTab.jsx`: lock marker; locked stories not draggable; **Lock selected** / **Unlock selected** buttons with the "n skipped (no ID)" note; bulk edit confirmation reports skipped locked stories for an Epic change
- [x] 5.4 `App.jsx`: Alt+D on a locked story shows the "unlock first" message instead of deleting; Ctrl+Up/Down unchanged

## 6. Review UI

- [x] 6.1 `Suggestions.jsx` / `StoryForm.jsx`: banner for open `unlock` rows (Reason, Unlock, Dismiss); Unlock uses the reducer's unlock then marks the row applied via `useReview`
- [x] 6.2 Field-edit chips and split groups of a locked story: Apply disabled with a hint, Dismiss available; `ReviewTab.jsx` lists `unlock` rows and shows the same disabled state; story list badge counts them

## 7. Docs and verify

- [x] 7.1 Update `CLAUDE.md` (Architecture: `Locked` column, locked IDs in `ids.js`; Workflow: review skill scope line and `unlock` rows) and the `README.md` if it lists columns or review actions
- [x] 7.2 `npm test` passes and `npm run build` succeeds
- [x] 7.3 In the browser: lock a story, delete/reorder a story above it (locked ID unchanged), try drag / Move to Proposed / delete on it (blocked), run Lock/Unlock selected with a story without an ID, write a review with an `unlock` row plus a field edit and check banner, disabled Apply, Unlock, and the reader's scope line
