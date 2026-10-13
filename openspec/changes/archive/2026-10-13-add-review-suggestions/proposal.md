## Why

The `review-backlog` skill reports findings as chat text, so the user has to retype every suggested fix into the portal by hand. Findings should arrive as data the portal can show next to the field they concern, and apply with one click.

## What Changes

- The review skill writes its findings to a CSV, `reviews/<backlog>.csv`, mapped to stories by Story ID. It writes only through a Node script, `.claude/skills/review-backlog/write-review.mjs`, which is the single write path. The skill's `allowed-tools` drops general write access and permits only that script.
- Every finding yields at least one concrete field edit (replace, add or remove a value, add a story), so nothing is left as advice only. Edits that need a decision from the user carry a proposed default marked `confirm`.
- The script validates input against fixed allow-lists, fills `Current` itself from the backlog, checks group consistency, quotes CSV correctly, writes atomically, and never touches `user-stories/`.
- New `reviews` store in `server.js`, so the portal can read and update review files with the existing file API.
- The portal shows each open suggestion inline next to its field in the story form, with Apply and Dismiss. Story list rows show a count badge. Apply goes through the existing `useBacklog` reducer, so `renumber` and autosave keep their invariants. A suggestion whose `Current` no longer matches the live field is shown as stale and cannot be applied. Applied and dismissed state is written back to the review CSV.
- Split suggestions are applied as a group: the original story is narrowed and the new stories are created together.
- **BREAKING** (for the skill contract): the skill no longer "never writes". It may write the review CSV, through the script, and still never writes the backlog CSV.

## Capabilities

### New Capabilities
- `backlog-review-suggestions`: the review CSV format, the write script and its guardrails, how the skill produces field edits for every finding, and how the portal presents and applies suggestions.

### Modified Capabilities
- `user-story-editor`: the story form and list gain suggestion chips, a count badge, and Apply and Dismiss behaviour.

## Impact

- New: `.claude/skills/review-backlog/write-review.mjs`, `test/write-review.test.mjs`, a `reviews/` data folder (git-ignored like `user-stories/`), a review module in `src/user-story-generator/` and its tests.
- Changed: `.claude/skills/review-backlog/SKILL.md`, `server.js` (`STORES`), `src/user-story-generator/hooks/useBacklog.js`, `components/StoryForm.jsx`, `components/StoryList.jsx`, `tool.css`, `CLAUDE.md`, `.gitignore`.
- Sequencing: the `backlog-review-skill` spec (with its "SHALL NOT modify any other file" rule) exists only in the in-flight change `rename-story-hierarchy-and-add-review-skill`. That change should be archived first. This change then supersedes the rule through the requirements in `backlog-review-suggestions` (see design.md).
