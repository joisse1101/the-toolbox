## Why

A review spends effort on every story in the backlog, including ones the team lead already considers settled. There is no way to say "use this story as reference, but do not review or reshuffle it". A lock gives settled stories a stable ID and keeps them out of the review, while still letting the reviewer say so when it has a strong objection.

## What Changes

- New per-story **lock**, stored in a new `Locked` column of the backlog CSV (`Yes` or empty). A story without an ID (no Epic) cannot be locked.
- A locked story cannot be dragged or reordered (drag and drop; Ctrl+Up/Down only moves the selection and is unaffected), cannot be moved to Proposed, and cannot be deleted. Only its **Epic** field becomes read-only; every other field, including dependencies, stays editable.
- **Story IDs:** a locked story keeps its ID. Unlocked stories take the lowest free numbers in row order around the locked ones (gaps are acceptable). Locked IDs are reserved, so no two stories share an ID, including epics with equal initials.
- Lock toggle in the story form; **Lock selected** and **Unlock selected** in the Stories tab (stories without an ID are skipped with a count). Bulk edit that sets an Epic skips locked stories and reports the count.
- `read-backlog.mjs` prints a scope line ("N of M stories submitted for review, K locked (reference only)") above the CSV; locked rows stay in the CSV as context.
- The review skill does not review locked stories. For a strong objection to one it writes a new review action **`unlock`**; the portal shows it as a banner above the story with Unlock and Dismiss. Field-edit rows for a locked story are accepted by `write-review.mjs` only if the file also holds an `unlock` row for that story, and the portal disables their Apply until the story is unlocked.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `user-story-editor`: `Locked` CSV column, lock toggle and bulk lock/unlock, locked-story restrictions (reorder, shortcuts, Epic field, delete, bulk Epic edit), ID rules for locked stories.
- `backlog-review-skill`: locked stories are not reviewed; scope line from the reader; `unlock` rows for strong objections.
- `backlog-review-suggestions`: `unlock` action and banner, validation of rows on locked stories, Apply disabled on locked stories.
- `story-proposals`: Move to Proposed is unavailable for locked stories.

## Impact

- `core/model.js` (`COLUMNS`, story model, serialization), `core/ids.js` (`renumber`), `core/review.js` (new action, validation, apply rules).
- `.claude/skills/review-backlog/` (`read-backlog.mjs`, `write-review.mjs`, `SKILL.md`).
- Frontend `user-story-generator/`: story form, story list / drag and drop, Stories tab bulk bar, Review banner, keyboard shortcuts, `useBacklog` reducer.
- Tests: `test/ids.test.mjs`, model and review tests.
- Existing backlogs gain an empty `Locked` column on their next save; no migration needed.
