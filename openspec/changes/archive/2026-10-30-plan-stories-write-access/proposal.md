## Why

A `/plan-stories` session finds conflicts between stories while it draws (a flow two stories disagree on, a term used two ways), and the user has to fix the stories to resolve them. The session cannot: `plan-stories.ps1` starts `backlog-tools --read-only`, so `check_drafts` and the four writers do not exist, yet `/propose-stories` is still listed in the session and can be invoked. The agent then drafts to the end and only reports at the last step that it cannot validate or write (GitHub issue #42).

## What Changes

- `plan-stories.ps1` starts `backlog-tools` without `--read-only`, so the session has `check_drafts`, `write_proposals`, `write_lexicon`, `suggest_lexicon_change` and `write_review`. `check_drafts` is pre-approved with the readers; the four writers are not, so Claude Code asks before every story write, on top of `propose-stories`' own yes/no.
- The plan-stories skill still writes only diagrams and the context map itself. Story and term changes go through `propose-stories` (or `/story:propose`) in the same session, which keeps the diagram writer and the story writers separate. The skill's rule changes from "no tool writes stories" to "this skill never calls a story writer".
- The plan-stories skill tells the user, when it hands off, that a review row on a backlog story takes effect only once they Apply it in the portal and that the slice shows STALE after (the existing stale check already covers this), and that a conflict they do not want to settle yet can go in the slice's `Open questions` instead.
- `propose-stories` and `/story:propose` check at the start that `check_drafts` is among their tools. If it is not (a read-only session such as `explore-stories`), they stop before reading or drafting, say the session is read-only and name `shape-stories.ps1` and `plan-stories.ps1` as the launchers that start a session with the writers. `/story:review` only reads, so it does not stop: it skips the `check_drafts` step and says so.
- The `CLAUDE.md` plan-stories paragraph, the launcher header and the `plan-stories` skill text are brought in line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plan-stories-skill`: the tools requirement (full `backlog-tools`, `check_drafts` pre-approved, writers not), the skill's boundary (never calls a story writer; hands off to `propose-stories`), and the notice about Apply and STALE.
- `story-writing-skills`: `propose-stories` and its commands stop with a clear message when `check_drafts` is not available; `/story:review` skips its draft check and says so.

## Impact

- `planner/claude/launchers/plan-stories.ps1` and `backlog-tools-config.ps1` (the config no longer passes `--read-only` for this session; `--allowedTools` gains `check_drafts`).
- `.claude/skills/plan-stories/SKILL.md`, `.claude/skills/propose-stories/SKILL.md`, `.claude/commands/story/propose.md`, and `.claude/commands/story/review.md`.
- `CLAUDE.md`. No change to `backlog-tools.mjs`, the writers, the portal or the data files.
- Risk: a planning session can now write proposals, review rows and lexicon suggestions. None of them changes `planner/data/backlogs/`; each needs Apply or Accept in the portal, so the backlog stays user-controlled.
- Tests: `test/backlog-tools-mcp.test.mjs` and the launcher/skill text checks may need the plan-stories expectations updated.
