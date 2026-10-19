## Why

In a shape session the agent can only find a related story by reading the whole `index` section (every backlog story with its User Story text) and the whole `proposals` section. That is a large result for one question, and an open-ended read of that size has caused bloated context and failing tool calls before. The Stories tab already answers "which stories mention X" with a word search over every field; the sessions have no equivalent.

## What Changes

- New read-only MCP tool `search_stories` in the `story-tools` server. Input: `backlog` and `query` only. It matches stories with the same rule as the Stories tab search (`matchesQuery`: every word, any field, ignoring case).
- It searches the backlog (`user-stories/`) and the proposals (`proposals/`, benched stories left out) and returns one short line per match: ID, Title, Epic > Feature, and whether it is a backlog or a proposed story. The agent then reads the story it wants with `read_context` (`storyId` + `storyTitle`), which is already how one backlog story is read; proposed stories are read from the `proposals` section.
- The output is capped (about 25 lines, then "N more, narrow the query"); no match is a normal reply, not an error; a blank query is refused with a pointer to the `index` section.
- The tool is available on the `--read-only` server (so `explore-stories` gets it) and is pre-approved by the launchers, like `read_context`.
- `explore-stories`, `propose-stories` and the `/story:*` commands list the tool in `allowed-tools` where they read, and their instructions say to search for related stories first instead of reading the whole `index`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-tools-mcp`: the server exposes `search_stories` (also with `--read-only`), its description carries its rules, and it is read-only and pre-approved.
- `story-writing-skills`: the explore and propose skills find related stories with `search_stories` and read only the stories they need.

## Impact

- `core/story-search.js` (a pure function that filters, caps and formats matches), `.claude/skills/explore-stories/read-story-context.mjs` (reads the two files and calls it), `ai/mcp/story-tools.mjs` (tool, description, read-only list).
- `ai/launchers/explore-stories.ps1`, `ai/launchers/shape-stories.ps1` (`--allowedTools`), `.claude/skills/explore-stories/SKILL.md`, `.claude/skills/propose-stories/SKILL.md`, `.claude/commands/story/*.md` (`allowed-tools` and wording).
- `test/story-search.test.mjs`, `test/story-tools-mcp.test.mjs`; `CLAUDE.md` and `README.md` (tool lists).
- No change to the CSV files, the portal, or any writer.
