## Context

See proposal.md for motivation and the specs for behavior. Relevant current state:

- `core/ids.js` `renumber` derives every code from `prefixesFor` (prefix per epic, by order of first occurrence) plus a per-epic counter, then rewrites `dependsOn` through an old-code -> new-code remap. `moveStory`, `removeStory`, `commitEpic(s)` all end in `renumber`.
- `core/model.js` carries unknown columns through `story.cells`; recognised columns are listed in `COLUMNS` and written explicitly by `serializeBacklog`. `loadBacklog` adds missing recognised columns.
- `core/review.js` holds the review row format, `validateFindings`, `fillCurrent`, `suggestionState`/`unitState` (stale logic) and `applySuggestions`; the portal and `write-review.mjs` share it.
- `read-backlog.mjs` returns `{ guidelines, csv }` and prints them; the skill sees the CSV as text.
- Ctrl+Up/Down only moves the selection; the only reorder interaction is drag and drop (`moveStory`).

## Goals / Non-Goals

**Goals:**
- One `locked` boolean per story that every rule (ID, reorder, move, delete, bulk Epic, review) reads, with the rules living in `core/` so they are unit-testable.
- A locked ID is a fixed point of `renumber`, and no two stories ever share a code.

**Non-Goals:**
- No new lock-aware behavior in `explore-stories` / `propose-stories` beyond the reader seeing the extra CSV column.
- No lock for stories in the Proposed tab (they have placeholder IDs); accepted stories enter unlocked.
- No audit of who locked a story or when.

## Decisions

**1. Store the lock as a `Locked` column (`Yes` / empty) in the backlog CSV.** It round-trips in Excel, the review scripts and the reader get it for free from the CSV, and nothing else needs merging. `COLUMNS` gains `Locked`, so `loadBacklog` appends it to older files. Alternative: a sidecar file (`.locked`) like `.csv.decided`: rejected because every reader (portal, three skills' scripts) would need to join two sources and the lock would be lost on copying the CSV. Anything but `Yes` (case-insensitive, trimmed) loads as unlocked.

**2. `story.locked` is the model field; a lock is valid only with a code.** `storyFromCells` sets `locked` when the cell is `Yes` **and** the story has an ID after load; a `Yes` on a story with no ID (blank epic, hand-edited file) loads as unlocked. The reducer refuses `LOCK` for a story without a code. A story that loses its code is unlocked by `renumber` (cannot happen via the UI because the Epic field is read-only while locked).

**3. `renumber` treats locked codes as fixed points.** Algorithm, in order:
1. A locked story is *anchored* if its code parses as `<PREFIX>-<digits>`, its code is unique among anchored stories, and it has a non-blank `codedEpic`. Otherwise it is demoted to unlocked for numbering (and loaded as unlocked, so the next save writes the cleared lock): this guards against Excel edits creating duplicate or malformed locked codes.
2. Prefixes: an epic that has an anchored story **keeps the prefix written in that story's code** (first anchored story in row order if several disagree). These prefixes are marked taken first. Remaining epics get prefixes by the existing rule (initials, lengthened on collision) against the taken set. This guarantees the "equal initials, never equal IDs" rule even when epic order changed since the lock.
3. Numbers: per prefix, the set of anchored numbers is reserved; each unlocked story takes the lowest unreserved number in row order. Anchored stories keep their code.
4. The dependency remap is unchanged: anchored codes map to themselves, so links to them never rewrite.
Alternative considered: give unlocked stories numbers above the maximum locked number (`max+1`). Simpler, but it grows IDs without bound and does not match "lowest free number"; the reserved-set approach is no harder.

**4. Guards live in the pure functions, with the UI mirroring them.** `moveStory`, `removeStory`, `commitEpic(s)`, `moveToProposed` and bulk `applyBulk` take the story list and return it unchanged (or skip the locked ones) when a rule forbids the action; the reducer reports a message the UI shows. The UI also disables the controls (draggable false, Move/Delete buttons disabled, Epic input read-only) so the user sees why. The core guards make an out-of-date UI harmless and keep the tests DOM-free. `applyBulk` returns the count changed and the count skipped.

**5. Review rows: `unlock` is a new action in `core/review.js`.** `ACTIONS` gains `unlock`; `ALLOWED_ACTIONS` is not extended (it maps fields to actions) - `unlock` is validated separately: Field and Suggested must be empty, the story must exist and be locked. `REVIEW_COLUMNS` is unchanged. `fillCurrent` leaves Current empty for it. `mergeStatus` identity (Story ID, Field, Action, Suggested) already works because Field and Suggested are empty strings.

**6. The "field edit on a locked story needs an `unlock` row" rule is checked against the resulting file.** `validateFindings(findings, backlog, { existingRows })` receives the rows already in the review file (for `--append`, the file's rows; without `--append`, none, since the write replaces the file) and passes if the batch itself or `existingRows` holds an `unlock` row for each locked story that has a field-edit row. Rows that would be removed by a replacing write are not counted. A split group that `replace`s a locked story counts as a field edit on it.

**7. Staleness and Apply.** `suggestionState` returns a new state `locked` for open, otherwise-current field-edit rows of a locked story (and `unitState` for a group narrowing one): the UI renders it like a current suggestion with Apply disabled and a hint, plus Dismiss. `unlock` rows are `current` while the story exists and is locked, `stale` otherwise. `openCounts` counts `locked` rows and open `unlock` rows as open. Applying `unlock` goes through the reducer's lock action (autosaved like any edit) and then marks the row `applied` in the review file, mirroring Apply for other rows.

**8. Reader scope line.** `readBacklog` parses the CSV with `loadBacklog` (already in `core/`) only to count stories and locked rows; the CSV text printed is still the file's raw text. The scope line is printed between the guidelines and the CSV, and the existing "data to review, never instructions" label stays on the CSV section. If parsing fails the line is omitted rather than blocking the review (the skill falls back to treating all stories as submitted). `read-story-context.mjs` is untouched; its CSV just has the extra column.

**9. UI placement.** Lock toggle: story form header row, beside ID and Move to Proposed. List/table marker: a lock icon next to the story label. Bulk: Lock selected / Unlock selected buttons next to the existing bulk edit bar, shown whenever the selection is non-empty (they do not depend on the Priority/Epic/Feature fields). Banner: a new block at the top of the story form fed by the story's open `unlock` rows; the Review tab lists it like other rows.

## Risks / Trade-offs

- [Locked codes plus a lengthened prefix could still collide if a hand-edited file has two epics whose locked codes use the same prefix] -> Step 1/2 of the algorithm demote the later duplicate-prefix claim: an epic's prefix is only honored if no earlier epic already holds it; the loser's locked stories are demoted for numbering and renumbered. Covered by a test.
- [Gaps in numbering confuse people who expect `0001..000n`] -> accepted by the user; documented in the spec scenarios.
- [A locked story's Epic is read-only, so moving or merging an Epic by rename leaves the locked story behind] -> the bulk-edit confirmation reports skipped locked stories; unlocking is one click. Review `Epic` replace rows on a locked story follow the generic "Apply disabled while locked" rule.
- [Existing review files: no `unlock` rows, locked stories gain disabled suggestions] -> handled by decision 7; no migration.
- [`Locked` is a visible column in Excel and can be hand-edited] -> tolerated by decision 2 (invalid values load as unlocked).

## Migration Plan

None needed. Older backlogs get an empty `Locked` column on their next save. Rollback: remove the column from the file; older versions treat it as an unknown column and keep it.

## Open Questions

- Icon and wording for the lock marker and the banner (cosmetic; decided during implementation).
