## Why

A story's `Depends On` can list an entry that no story holds: a code that does not exist, the story itself, or a `NEW-<n>` placeholder of a still-proposed story. The consistency review finds these, but a review `remove` row for one is refused by the writer ("is not a story in the backlog", "cannot depend on itself") and Apply could not carry it out anyway, because Apply looks the target up as a story. The `review-backlog` skill therefore asks a Clarifications question instead of suggesting the removal, and the user has to fix the link by hand.

## What Changes

- A `Depends On` `remove` row names an entry in the story's own `Depends On`; it no longer needs a story behind that entry. The writer accepts it when the story lists the entry, whether or not a story holds the code, and whether or not it is the story itself or a `NEW-<n>`.
- Apply removes that entry literally. A `remove` row is stale only when the story no longer lists the entry (already the case). Nothing tries to guess what a dangling code means now: an entry that later became a real story is removed like any other.
- `targetTitle` on a `remove` row is checked when a story holds the code and may be left out when none does.
- `add` rows keep every current check (existing story, not itself, no cycle, `NEW-<n>` only inside its group).
- The `review-backlog` skill goes back to a `remove` row (Area `INVEST`) for every dependency problem; the Clarifications workaround is dropped.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-review-suggestions`: "Script validates findings" (a `remove` on `Depends On` is not checked against the backlog's stories), "Applying a suggestion" (a `remove` removes the listed entry), "Rows written through the tool name the story's Title" (`targetTitle` optional on a `remove` row when no story holds the entry).
- `backlog-review-skill`: the dependency rows the skill writes.

## Impact

- `core/review.js`: `validateFindings` and `applySuggestions`.
- `test/review.test.mjs`.
- `.claude/skills/review-backlog/SKILL.md` and the review-backlog paragraph of `CLAUDE.md`.
- The `write_review` tool description in `ai/mcp/story-tools.mjs` if it states the old rule; `test/story-tools-mcp.test.mjs` checks it.
- No change to the review file's columns, the portal UI or any data file.
