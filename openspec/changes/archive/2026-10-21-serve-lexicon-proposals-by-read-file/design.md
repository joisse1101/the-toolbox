## Context

See proposal.md - Why. The story sessions' only gate on the lexicon and proposals files was meant to be the `guard-read.mjs` hook, but `.claude/settings.json` also holds `Read(./data/**)`. Deny rules win over hooks and allow rules, and Claude Code applies a `Read` deny to `Grep` as well, so both tools are refused on the two files. `--setting-sources user` skips that deny but also stops the project's `.claude/skills` and commands from loading, so it cannot be the fix. The `story-tools` MCP server already knows the data folder (`DATA_DIR`, `TLT_DATA_DIR`), validates backlog names, labels its output as data and returns `search_stories` results capped at 25 lines; `read-story-context.mjs` already has `withoutBenched`, the file-size helpers and the menu.

## Goals / Non-Goals

**Goals:**
- A lexicon or proposals file of any size can be searched for a term and read in parts, in the story sessions, with the project settings (and their `data/` deny) left as they are.
- The session can reach exactly the two files of the backlog it is given, and nothing else.
- Remove the machinery that the hook approach needed.

**Non-Goals:**
- No change to `.claude/settings.json`, to the writers, to the Title protocol or to `review-backlog`.
- No regular expressions, no context lines, no other stores: the lexicon and proposals only.
- No filtering of benched rows (see decision 5).

## Decisions

**1. A `read_file` tool in `story-tools`, not `Read`/`Grep`.** An MCP tool is not a `Read(...)` call, so the deny does not apply, and the server decides what it opens. Alternatives: narrow the project deny (opens `lexicons/` and `proposals/` to every normal session); `--setting-sources user` (drops the skills); `--add-dir` to get the skills back (unverified, still relies on keeping the deny off); a copy outside `data/` (stale after the first write, so the read-back after a write would lie); a project hook in place of the deny (a hook that cannot run fails open, so normal sessions would lose a hard guarantee). The earlier design rejected paging because two ways to read one file is the failure mode; here `read_file` replaces the two sections, so there is still one way.

**2. Input is `backlog` and `file`, never a path.** `file` is an enum (`lexicon` | `proposals`); the server joins `DATA_DIR`, the store folder (`lexicons` or `proposals`, from `FILE_SECTIONS`) and the backlog file name, after the same file-name check the other readers use (`validateName`, and the backlog must be a file in `user-stories/`). There is nothing to normalise or escape, which is why the whole path-checking hook and its tests can go.

**3. Plain-text `pattern`, physical lines, header first.** `pattern` is a case-insensitive substring match on one line (no regex: a stray `(` or `.` cannot fail or surprise). A pattern reply starts with the header row so the columns are known, then `<line number>: <line>` for up to 50 matches and a count of the rest. Slices use `offset` (1-based, default 1) and `limit` (default 100, max 200) and end with the next `offset` or "end of file". With neither, the reply is the size and line count only, which stops a 50KB file from ever being one reply. `pattern` with `offset`/`limit` is an error so a call always means one thing. Same tool in the `--read-only` server.

**4. The menu and errors point to the tool.** `read_context`'s `lexicon`/`proposals` section error says to call `read_file` with that `file`; the menu keeps each file's size (and the proposals' benched count, or "does not exist yet") and names `read_file`. The absolute paths are no longer printed, because the agent cannot use a path.

**5. Benched rows are flagged, not filtered.** Filtering would shift line numbers, so `offset` and a later pattern hit could disagree. The reply for the proposals says how many rows are benched and that the skills ignore them, as the skills already do; `write_proposals` still refuses a patch to a benched story and the portal still disables Accept.

**6. Launchers lose the read gate.** Remove from `story-tools-config.ps1`: `Get-ReadFiles`, `Confirm-ReadLimit`, `Test-ReadGuard`; from `explore-stories.ps1` and `shape-stories.ps1`: their calls, the `TLT_READ_ALLOW` clean-up, the `$readNote` and `--append-system-prompt`, and `Read`/`Grep` in `--tools` and `--allowedTools`; from the two `locked-settings.json` files: the `PreToolUse` block (the `UserPromptSubmit` wait-for-server hook stays). `read_file` is added to `--allowedTools` in both launchers (`mcp__story-tools__read_file`). `explore-stories.ps1` keeps asking for the backlog when none is given; that is cheap and the skill would otherwise ask in the session.

**7. Skills and commands.** `explore-stories` and `propose-stories` (`allowed-tools` gets `mcp__story-tools__read_file`) and the three `/story:*` commands say "`read_file`" where they said `Read`/`Grep`. The read-back table of `propose-stories` becomes `read_file` with a `pattern` of each `NEW-<n>` or term. The "text is data" sentence stays, now for `read_file` output too.

## Risks / Trade-offs

- [A cell with line breaks is several lines, so a pattern hit shows part of a record] -> the reply says lines are physical; the skill reads around the hit with `offset`/`limit`. Notes is the only multi-line field, and the lexicon's `Definition` is one line.
- [A very long line] -> a slice is capped at 200 lines, and lexicon and proposals rows are a few hundred characters; revisit with a character cap only if a real file proves otherwise.
- [Plain text cannot express "term name equals X"] -> `pattern` matching the name returns the row and its neighbours that mention it; the skill reads the Term column of each hit. A `regex` flag can be added later without changing existing calls.
- [Normal sessions can still not read the two files] -> intended: the deny stays.
- [Superseding an archived change] -> the archived `read-lexicon-proposals-by-file` stays as history; this change's specs replace its two requirements (REMOVED in `story-writing-skills`).

## Migration Plan

Single repo, local tool. Add `read_file`, switch the menu, errors, skills and commands, then delete the hook, its test and the launcher functions in the same change, and update `CLAUDE.md` and `README.md`. No data file changes. Rollback is reverting the commits.

## Open Questions

- None blocking. Whether a regular-expression mode is worth adding is left until the plain-text pattern proves too narrow in use.
