## Why

A 50KB lexicon cannot be read in a shape-stories session: `read_context` returns the `lexicon` section in one reply, the result is over Claude Code's MCP output limit, and the session has no Read tool to open what it is pointed to. The lexicon and the proposals are the two sections that only grow, and neither has a way to be read in parts (the index has `search_stories`, reviews have `storyIds`).

## What Changes

- The story sessions get **Read** and **Grep**, limited by a PreToolUse hook to the lexicon and proposals files of the session's backlog. Both tools can read in parts (`offset`, `limit`, a search), so a large file is never one reply.
- `read_context` no longer serves the `lexicon` and `proposals` sections. Asking for either is an error that names the file path to read; the menu lists them as files, not sections. **BREAKING** for any caller of those two sections.
- The launcher resolves the absolute paths of the backlog's lexicon and proposals files (`TLT_DATA_DIR` respected) and gives them to the session, so the agent never guesses them.
- The launcher prints the hook (the folders and files it allows) before Claude starts and waits for the user to press Enter, so the user sees and confirms what the session can read.
- The skills and the `/story:*` commands read those two files with Read and Grep, ignore rows with `Benched: Yes` (they are not filtered out any more; `write_proposals` still refuses to patch them), and treat file text as data to work from, not instructions.
- Verification after a writer call (`write_proposals`, `write_lexicon`) reads the file back with Read or Grep instead of `read_context`.
- `/story:re-read` re-reads the lexicon and proposals with Read.
- `review-backlog` is unchanged (it runs under Bash and `read-backlog.mjs`).

## Capabilities

### New Capabilities

### Modified Capabilities

- `story-tools-mcp`: `read_context` sections lose `proposals` and `lexicon`; the benched-count requirement for the proposals section is removed; the permissions requirement covers the read hook.
- `story-writing-skills`: the locked-down access requirement allows scoped Read and Grep and describes the launcher's confirmation step; the skills read the lexicon and proposals by file; `/story:re-read` reads those two files by file.

## Impact

- `ai/mcp/story-tools.mjs`, `.claude/skills/explore-stories/read-story-context.mjs`: remove two sections and update the menu, descriptions and errors.
- New hook script under `ai/mcp/` (read/grep path check built from `STORES` and `DATA_DIR`).
- `ai/launchers/explore-stories.ps1`, `shape-stories.ps1`, `story-tools-config.ps1`, the skills' `locked-settings.json`: tool list, hook, resolved paths, the Enter confirmation.
- `.claude/skills/explore-stories/SKILL.md`, `propose-stories/SKILL.md`, the `story:*` commands.
- `test/story-tools-mcp.test.mjs`, new hook tests; `CLAUDE.md` and `README.md` text.
