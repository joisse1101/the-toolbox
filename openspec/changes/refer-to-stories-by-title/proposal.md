## Why

The story skills (`explore-stories`, `propose-stories`, `/story:propose`, `review-backlog`) name stories by ID in everything the user reads and types. A backlog ID (`IAM-0004`) is derived from the epic's initials and the story's position, so `renumber` changes it whenever a story is added, deleted, moved or reordered; a `NEW-<n>` says nothing about content either. An ID printed earlier in a session can therefore point at a different story after a portal edit, and an agent that writes a review row or a patch against a stale ID changes the wrong story without noticing. A story's Title is far more stable and, when it does change, still hints at which story was meant.

## What Changes

- The skills refer to stories to the user **by Title** (in quotes, with Epic > Feature only where two stories share a Title). An ID is never the only name in a draft, a summary or a question; the skills look the ID up in the `index` themselves, so the user does not have to read or type one.
- The `story-tools` tools take a story's current Title next to its ID and check the pair. On a mismatch nothing is written and the reply says what the ID holds now and which stories carry the given Title (with ID and Epic > Feature), so the agent can relocate the story, read it again and repeat the call.
  - `read_context`: `storyId` plus `storyTitle`; the `reviews` filter `storyIds` becomes a list of `{id, title}`.
  - `write_review`: each row gets `storyTitle`; a `Depends On` row also gets `targetTitle` for the story in `suggested`.
  - `write_proposals`: a patch gets `storyTitle` (the current Title of the proposal; `title` stays the field to change); a `dependsOn` entry that names an existing story (backlog or `proposed:`) is `{id, title}`; `NEW-<k>` references inside one call stay bare.
- The Title is **required** by the tools in the MCP layer. The CLI scripts (`read-story-context.mjs`, `write-proposal.mjs`, `write-review.mjs`) keep their current input and check a Title only when one is given, so they produce the results they did before.
- The opening prompt built by `shape-stories.ps1` carries the Title of the story it resolved (`NEW-57` or `IAM-0004`) next to the ID, so the skill speaks in titles from the first reply. The launcher's accepted arguments do not change.
- Nothing stored changes: the CSV files, the review file's `Story ID` column and the portal keep using IDs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-tools-mcp`: tool inputs carry the Title next to every existing-story ID; the mismatch reply; descriptions state the rule.
- `story-proposal-writer`: patches and existing-story `dependsOn` entries are checked against their Title; the writer's check form reports the same mismatches.
- `backlog-review-suggestions`: review rows written through the tool carry `storyTitle` (and `targetTitle` for `Depends On`) and are checked against the backlog; the stored row is unchanged.
- `story-writing-skills`: both skills name stories by Title in prose and relocate a story on a mismatch; the launcher puts the Title in the opening prompt.
- `backlog-review-skill`: the review report names stories by Title.

## Impact

- Code: `core/` (a new pure helper that resolves an ID and Title against a list of stories; `proposal-input.js` and `review.js` call it), `.claude/skills/explore-stories/read-story-context.mjs`, `.claude/skills/propose-stories/write-proposal.mjs`, `.claude/skills/review-backlog/write-review.mjs`, `ai/mcp/story-tools.mjs` (schemas, descriptions, mismatch text), `ai/launchers/shape-stories.ps1`.
- Skill text: `explore-stories/SKILL.md`, `propose-stories/SKILL.md`, `review-backlog/SKILL.md`, `.claude/commands/story/propose.md`.
- Tests: `story-tools-mcp`, `read-story-context`, `write-proposal`, `proposal-input`, `write-review` and `review` tests, plus tests for the new helper.
- **BREAKING** for any caller of the MCP tools that sends a bare ID for an existing story: it is refused with a message that says to add the Title. No stored data and no CLI call is affected.
