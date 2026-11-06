# Proposal

## Why

A story's ID is worked out from its position in its Epic, so it moves whenever stories are added, deleted or reordered, and two backlogs can both hold `IAM-0001`. Slices, tasks and archived pages all name stories, so a moving or repeated ID breaks the trail. The lock that exists today only guards move, delete and Epic edit, so a locked story's text can still change. This is PR 1 of issue #98 (the story-to-code pipeline); every later PR names stories and depends on a story that stays put and has an ID that is unique.

## What Changes

- **BREAKING** Replace the lock with a **frozen** state. The `Locked` column, the lock toggle, the per-Epic and per-Feature lock buttons, Lock selected and Unlock selected, and the review's `unlock` row and banner are removed. An old `Locked` value is ignored and dropped on the next save, so nothing is frozen at the start.
- A frozen story is read-only in every field. It cannot be dragged, moved to Proposed, deleted or renumbered, and the portal has no way to freeze or unfreeze it. A mistaken freeze is fixed by editing the CSV by hand.
- `jois-story-plan` freezes the stories of a slice after the user confirms the slice, through a new validated writer script. This is one stated exception to "never writes the backlog", limited to the frozen flag. A shared freeze function in `planner/logic/` does the work and `sync-skill-logic.mjs` copies it into the skill.
- The story ID becomes `<BACKLOG-INITIALS>-<EPIC-PREFIX>-<NNNN>`, for example `B1-IAM-0003`, stored whole in the `ID` column. Unfrozen stories carry the backlog initials too, so opening a file gives existing IDs the initials with no separate migration.
- The Epic prefix is fixed from the Epic's first frozen story. A later Epic with the same initials gets `IAM1`, then `IAM2`; this replaces the letter-lengthening (`DD`, `DDI`).
- Unfrozen stories keep taking the lowest free numbers around the frozen ones. A new frozen number is never reused, because a frozen story is never deleted.
- Each backlog has initials, defaulting to the lowest unused `B<n>`, edited in an Initials box beside the Backlog name box and stored in a small `backlog.json` in the backlog folder. The portal refuses initials that a sibling backlog uses or that already appear in a frozen ID there. Changing initials affects only unfrozen stories.
- The wiki pages that describe locks and IDs are updated in the same change, and `python scripts/check_docs.py` passes.

Non-goals: a way to change a frozen story (the superseding story is PR 2); read-only is a portal rule, so a hand-edited CSV can still change a frozen story's text.

## Capabilities

### New Capabilities
- `frozen-stories`: what a frozen story is, how `jois-story-plan` freezes the stories of a confirmed slice, and what the portal and skills do with a frozen story.
- `backlog-initials`: the backlog initials that start every story ID, where they are stored, how a default is chosen, how they are edited and how they are kept unique among sibling backlogs.

### Modified Capabilities
- `user-story-editor`: "Story IDs follow position" gains the backlog initials, the fixed Epic prefix with digit increment and the frozen-number rules; the three lock requirements ("Lock a story", "Lock and unlock selected stories", "Lock and unlock a group") are removed; "Delete selected stories" and the other requirements that mention locked stories skip frozen ones instead.
- `backlog-review-suggestions`: the `unlock` row and "Suggestions on a locked story cannot be applied" are removed; a suggestion on a frozen story is shown without Apply.
- `backlog-review-skill`: "Locked stories are reference only" becomes "Frozen stories are reference only", with no `unlock` row.
- `plan-stories-skill`: "Never writes outside diagrams" allows the one freeze write.
- `backlog-folder-layout`: the folder may hold `backlog.json`, and the rename and create flows carry the initials.
- `story-proposals`: a proposed story is never frozen, a frozen story cannot be moved to Proposed, and the placeholder `NEW-<n>` IDs are unchanged.
- `backlog-consistency-checks`: frozen stories, not locked ones, are checked as context only.
- `story-writing-skills`: an edit to a frozen story is not written as a review row and the skill proposes a superseding story instead; the reader's `index` section prints `Frozen` instead of `Locked`; `/jois-story:review` checks for edits on frozen stories.

## Impact

- Code: `planner/logic/backlog/ids.js` (prefix rule, frozen handling, freeze function), `model.js` (the `Locked` column becomes `Frozen`), `planner/logic/review/review.js` and `proposals.js`, `planner/portal/web/backlog-portal/` (story form, list, Stories tab, Suggestions, settings box), `planner/portal/server/server.cjs` (initials in create, rename and list), and a new writer script and copied logic in `toolkit/skills/jois-story-plan/`.
- Tests: `ids.test.mjs`, `review.test.mjs`, `model.test.mjs`, `reducer.test.mjs`, `proposals.test.mjs`, the server tests, the sample data under `planner/test/sample-data/`, and new tests for the freeze function and the initials checks.
- Skills and guidelines: `jois-story-review`, `jois-story-plan`, `jois-story-propose` and `planner/guidelines/product-backlog.md` stop mentioning locks.
- Wiki: `Planner-Guide`, `User-Flows`, `Story-Skills`, `Data-Folder` and `Logic-Layer`.
- Issue #98: the line "no two stories in any backlog share a permanent ID" now holds across backlogs.
