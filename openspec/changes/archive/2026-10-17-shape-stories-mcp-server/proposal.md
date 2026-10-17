## Why

The story sessions (`explore-stories`, `propose-stories`) reach the data only through Bash, behind a regex guard that allows exact script lines. Rules for the scripts live in SKILL.md prose, and one of those rules points at `review-backlog/SKILL.md`, which the guard blocks, so the agent guessed the acceptance-criteria row format and was rejected. Long JSON also has to pass through a shell heredoc, which fails with `unexpected EOF` and forces small batches. A typed tool interface carries its own description and schema, so the rules are always in context and no shell is needed. The same after-action review also found process gaps in the two skills (unstable draft numbers, "as before" confirmations, no early term-clash check).

## What Changes

- Add a stdio MCP server (`story-tools`, using `@modelcontextprotocol/sdk`) exposing typed tools: `read_context`, `write_proposals`, `write_lexicon`, `write_review`. Each tool calls the same exported function as the matching script (`readStoryContext`, `writeProposal`, `writeLexicon`, `writeReview`).
- Tool descriptions and input schemas state the rules the agent needs, including the review-row rules: one criterion per row, a `replace` starts with the label of the criterion it replaces (the label is its position), a `remove` takes the label alone, `unlock` row for a locked story. `write_review` always appends; it has no replace form.
- `read_context` is annotated read-only and pre-approved; the three writers are not pre-approved, so Claude Code still asks before every write.
- `shape-stories.ps1` and `explore-stories.ps1` start with `--mcp-config` and `--strict-mcp-config` and without `Bash`; `explore-stories` gets the read tool only (server started `--read-only`). **BREAKING**: `guard-bash.mjs`, its tests and the Bash `hooks` entry in `locked-settings.json` are removed from the two story sessions. `review-backlog` keeps its own guard and scripts.
- The scripts stay as thin CLI wrappers around the same functions (their tests keep working).
- Update `explore-stories` and `propose-stories` SKILL.md: refer to the tools instead of shell commands; check a new or renamed term against existing terms and Avoid words early and list the lexicon wording it affects; ask the question that decides the shape before drafting; number drafts in write order and keep the numbers stable; show one complete final text before the yes/no, never "as before"; print the drafts right before each write; keep the confirmation short enough not to be cut off.

## Capabilities

### New Capabilities
- `story-tools-mcp`: the MCP server, its tools, their descriptions and permissions, and how the two launchers start it.

### Modified Capabilities
- `story-writing-skills`: the "Read and write access is locked down" requirement moves from a Bash guard to the tool set; the launcher requirement changes its tool list; the skills requirements gain the confirmation and term-check rules.

## Impact

- New: `ai/mcp/story-tools.mjs`, `ai/mcp/mcp-config.json`-style config built by the launchers, `@modelcontextprotocol/sdk` in `package.json`.
- Changed: `ai/launchers/shape-stories.ps1`, `ai/launchers/explore-stories.ps1`, both skills' `SKILL.md` and `locked-settings.json`, `CLAUDE.md` (the paragraph on guards and launchers).
- Removed: `.claude/skills/explore-stories/guard-bash.mjs`, `test/guard-story-bash.test.mjs`.
- Data folders and `core/` are unchanged. Depends on nothing; `lexicon-change-suggestions` (a separate change) adds a fifth tool afterwards.
