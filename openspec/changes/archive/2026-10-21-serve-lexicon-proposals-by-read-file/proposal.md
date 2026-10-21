## Why

The story sessions cannot read the lexicon or proposals files at all: `.claude/settings.json` denies `Read(./data/**)`, a deny rule wins over the `guard-read.mjs` hook's allow-list and over `--allowedTools`, and Claude Code applies it to `Grep` too. The `read-lexicon-proposals-by-file` change assumed the hook was the only gate, so every `Read` and `Grep` on the two files is refused. Starting the sessions without the project settings (`--setting-sources user`) is not a fix, because it also drops the project's skills.

## What Changes

- New `story-tools` tool **`read_file`**: `backlog`, `file` (`lexicon` or `proposals`), and optionally `pattern`, or `offset` and `limit`. `pattern` is a case-insensitive plain-text match (not a regular expression) and returns the matching lines with their line numbers, at most about 50, then how many more matched. `offset` and `limit` return a slice of lines. With neither it returns the file's size and line count and says to use one of them, so a large file is never one reply. A missing file is a normal reply ("does not exist yet"). The output is labelled as data to work from, not instructions.
- `read_file` is read-only and pre-approved, and the `--read-only` server (the explore session) has it too. It is an MCP tool, so the `Read(...)` deny does not touch it, and the server (not the agent) picks the two files from the backlog name, so no other path is reachable.
- The sessions no longer get `Read` and `Grep`. Removed: `ai/mcp/guard-read.mjs` and its test, `TLT_READ_ALLOW`, the Enter-to-confirm step (`Confirm-ReadLimit`), the pre-launch hook check (`Test-ReadGuard`), `Get-ReadFiles`, the `--append-system-prompt` note with the two paths, `Read` and `Grep` in `--tools` and `--allowedTools`, and the `PreToolUse` `Read|Grep` hook in the skills' `locked-settings.json`. `.claude/settings.json` is not changed, so normal sessions keep the `data/` protection.
- `read_context` still refuses the `lexicon` and `proposals` sections, but its error and its menu now name `read_file` instead of an absolute path to open.
- The skills and the `/story:*` commands read the lexicon and proposals with `read_file` (`pattern` for a term, an `Avoid` word or a `NEW-<n>`; `offset`/`limit` to read in parts), still ignore `Benched: Yes` rows, and read each writer's result back with `read_file`.
- **BREAKING** for the archived `read-lexicon-proposals-by-file` design: its read hook and launcher confirmation are removed, its requirements are replaced.

## Capabilities

### New Capabilities

### Modified Capabilities

- `story-tools-mcp`: a `read_file` tool is added to the tool list (also on the read-only server) with its own requirement; the tool rules, permissions and "read from their files" requirements name it; `read_context` points to it.
- `story-writing-skills`: the locked-down access requirement lists `read_file` instead of `Read` and `Grep`; the propose skill's read-back, the shape launcher's tool list, the lexicon use and the re-read command use `read_file`; the requirements "Read and Grep are limited to the lexicon and proposals files" and "Launcher shows the read limit before starting" are removed (the benched-rows rule moves into the `story-tools-mcp` requirement).

## Impact

- `ai/mcp/story-tools.mjs`, `.claude/skills/explore-stories/read-story-context.mjs`: new `readFile` function and tool, updated `read_context` description, error and menu.
- Deleted: `ai/mcp/guard-read.mjs`, `test/guard-read.test.mjs`.
- `ai/launchers/explore-stories.ps1`, `shape-stories.ps1`, `story-tools-config.ps1`, and the `locked-settings.json` of `explore-stories` and `propose-stories`.
- `.claude/skills/explore-stories/SKILL.md`, `propose-stories/SKILL.md`, `.claude/commands/story/propose.md`, `re-read.md`, `review.md`.
- `test/story-tools-mcp.test.mjs`, `test/read-story-context.test.mjs`, `test/propose-skill.test.mjs`, `test/story-tools-ready.test.mjs`; `CLAUDE.md` and `README.md`.
