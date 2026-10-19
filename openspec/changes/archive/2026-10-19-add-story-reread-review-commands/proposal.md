## Why

In a shape session the user edits the backlog, proposals or lexicon in the portal between turns, and Claude keeps working from what it read earlier. The user has no way to say "look again" short of re-asking, and no way to ask "is everything I touched in sync, and what is left?" before closing the session.

## What Changes

- Add the command `/story:re-read`: Claude re-reads the files behind the shape session and the stories under discussion, says what changed since it last looked, drops drafts the change makes stale, and carries on. Read-only.
- Add the command `/story:review`: a read-only audit, scoped to what is under discussion (the stories shaped in the session, their dependencies, the lexicon terms they use or changed, and everything written this session). It ends with a checklist grouped by who acts. It never widens to the whole backlog; that stays with `review-backlog`.
- Both commands run in the existing shape session with `read_context` and `check_drafts` only; no new tool, launcher change or writer.
- Document both commands in `CLAUDE.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-writing-skills`: add requirements for `/story:re-read` and `/story:review`.

## Impact

- New files `.claude/commands/story/re-read.md` and `.claude/commands/story/review.md`.
- `CLAUDE.md` gains a short note. No code under `core/`, `app/` or `ai/` changes; no data is written.
