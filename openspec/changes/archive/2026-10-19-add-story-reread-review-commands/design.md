## Context

Shape sessions (`shape-stories.ps1`) allow only Skill, AskUserQuestion and the story-tools MCP; `read_context` and `check_drafts` are pre-approved. `/story:propose` is already a command file in `.claude/commands/story/`. The launchers' `claudeMdExcludes` does not affect commands.

## Decisions

- **Two command files, no skill.** Both are short instructions over existing tools, so they sit beside `propose.md` as `re-read.md` and `review.md`; the file name gives the slash command `/story:re-read`. `allowed-tools` lists `read_context` (and `check_drafts` for review) so no new prompt appears.
- **Re-read is a refresh, not an audit.** It skips `guidelines` (rarely changes), reads sections one per call as the skills do, and compares against earlier tool results already in the conversation; no state is stored.
- **Stories by Title.** Re-read reads stories with `storyId` plus `storyTitle`; on a mismatch the reader's reply lists candidates and the command follows the skills' rule.
- **Review scope is fixed to the session.** Scope = stories shaped, their `Depends On` neighbours both ways, terms they use or the session changed, and the session's writes. No `all` argument; `review-backlog` remains the wide check.
- **Output of review** is a checklist grouped "you, in the portal" / "me, via /story:propose" / "needs a decision", or an in-sync statement.
- Neither command writes, so the writers' read-back and confirmation rules do not apply.

## Risks

- Comparing with "what the session knew" depends on earlier results still being in context after compaction; the command says so when it cannot compare and then simply reports the current state.
