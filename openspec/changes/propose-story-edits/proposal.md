## Why

The shape-stories workflow (explore, then propose) can only add or patch *proposed* stories. When a discussion concludes that a story already in the backlog needs a change (an AC reworded, points changed, a dependency added), there is no way to carry it into the editor; the only writer of editor suggestions is `review-backlog`, a whole-backlog audit. The user has to remember the change and retype it.

## What Changes

- `propose-stories` can also draft **edits to existing backlog stories**. They are written as review rows through the existing `write-review.mjs --append`, so the portal shows them as Apply / Dismiss suggestions next to the field, exactly like audit suggestions.
- One reply shows new stories, patches to proposed stories and edits to backlog stories together. `/propose-stories` asks one yes/no for all of it; `/story:propose` shows the same and writes straight away. No rename, no new skill, no new command.
- Edits are always appended (never replace the review file), never use the review's `add-story`/split-group rows (new stories go to `proposals/`), and an edit to a locked story comes with an `unlock` row.
- The shape session's Bash guard additionally allows `write-review.mjs <file> --append <<'JSON'`; `explore-stories` stays read-only and says that backlog-story edits go through `propose-stories`.
- `shape-stories.ps1` accepts a backlog story ID (e.g. `IAM-0004`) as the story, validated against `user-stories/<backlog>`, and opens explore on that story's current text.
- Edits use the existing review `Area` values (no new value), mapped to the closest one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-writing-skills`: the Propose skill requirement gains edits to backlog stories (one confirmation, two writers, append-only, locked-story rule); the lock-down requirement allows the review writer's append form in the propose session; the launcher accepts a backlog story ID; the Explore skill points backlog-story edits to `propose-stories`.
- `backlog-review-suggestions`: "Single write path for reviews" is widened so that `propose-stories` may also write review rows, only through `write-review.mjs --append`.

## Impact

- `.claude/skills/propose-stories/SKILL.md`, `.claude/commands/story/propose.md` (allowed-tools, wording), `.claude/skills/explore-stories/SKILL.md`.
- `.claude/skills/explore-stories/guard-bash.mjs` (+ its test) in `--read-write` mode; `.claude/skills/propose-stories/locked-settings.json` unchanged (it already runs the guard).
- `ai/launchers/shape-stories.ps1`.
- `CLAUDE.md` and `README.md` sentences that say the propose skill writes only `proposals/`.
- No change to `core/`, the portal, `write-review.mjs` or `write-proposal.mjs`.
