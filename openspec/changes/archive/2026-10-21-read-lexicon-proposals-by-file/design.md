## Context

See proposal.md - Why. The shape sessions run with `--tools "Skill,AskUserQuestion"` plus the `story-tools` MCP server, so the only way to read the lexicon or proposals is `read_context`, which returns a whole section in one reply. `STORES` in `app/backend/server.cjs` and `DATA_DIR` in `core/paths.cjs` already say where the stores live; `.claude/skills/meeting-minutes/guard-bash.mjs` is the precedent for a hook that guards a locked session; the launchers already generate per-session config at launch (`story-tools-config.ps1`).

## Goals / Non-Goals

**Goals:**
- A 50KB (or larger) lexicon or proposals file can be read in parts or searched.
- The session can read exactly two files and nothing else new.
- The user sees, before Claude starts, what the session can read.

**Non-Goals:**
- No change to the writers, the Title protocol or `review-backlog`.
- No generic file access: the other stores and `ai/guidelines` stay behind `read_context`.

## Decisions

**1. Hook, not permission rules.** A PreToolUse hook (`ai/mcp/guard-read.mjs`, registered in the skills' `locked-settings.json` for matcher `Read|Grep`) allows a call only when its path resolves to one of two files given in an env var set by the launcher (`TLT_READ_ALLOW`, the two absolute paths). Alternatives: `--allowedTools "Read(path)"` only skips the prompt, other paths would still be askable; `deny` globs go stale when `TLT_DATA_DIR` or `STORES` change. The hook compares resolved paths (`path.resolve`, case-insensitive on Windows), so `..` and a folder path fail without extra rules. A `Grep` call without `path` is denied (its default would be the repo). The hook reads the allow list from the env, not from the tool input, so the agent cannot widen it.

**2. Only the two files, not the stores.** Narrower than "all stores plus guidelines": the failing sections are the only ones that need it, and the menu, `index`, `reviews` and guidelines keep their size controls. `user-stories/` stays behind `read_context` (`index`, `storyId`) because the Title check and the column filtering live there.

**3. The launcher resolves and prints the paths.** `story-tools-config.ps1` gains a function that returns the two absolute paths from the backlog name and `TLT_DATA_DIR` (same default as `core/paths.cjs`). The launcher prints them with the tool list, waits for Enter (`Read-Host`; `n` or Ctrl+C aborts and runs the existing cleanup), sets `TLT_READ_ALLOW` for the Claude process (hooks inherit it) and adds `Read,Grep` to `--tools`. The same values go into the opening prompt so the agent does not guess. What is printed is the env value, so it is what is enforced.

**4. `read_context` refuses the two sections with a pointer.** An error that names the absolute path is better than silently dropping the section: an old skill text or `/story:re-read` that still asks for it gets the fix in the reply. The menu lists the two files (path, size, benched count) so the agent finds them without the prompt. Alternative considered: keep the sections and add paging; rejected because two ways to read one file is the failure mode this change removes.

**5. Benched stories are ignored by instruction.** The proposals file is read raw, so benched rows are visible. The skills' text says to ignore `Benched: Yes`; `write_proposals` already refuses a patch to a benched story and Accept stays disabled in the portal, so a mistake cannot change one.

**6. Read-back after a write uses Read/Grep.** The writers still re-read their file themselves; the skill's read-back for proposals and lexicon becomes a `Grep` for the written IDs or terms.

## Risks / Trade-offs

- [Raw files carry no "data, never instructions" label] -> the skills state it in their text; the lexicon and proposals are user-made files, and nothing in the session can execute them.
- [A hook is only as good as its path check] -> unit tests for `..`, a folder, a neighbour backlog, a symlink-free case-variant path on Windows, a missing `path` on Grep, and no allow list set (deny everything).
- [Agent reads a 50KB file in one Read] -> fits in Read's limit (about 12-15k tokens); the skill text suggests `Grep` first for lookups.
- [Hook not firing, e.g. Claude Code changes the hook input shape] -> the hook fails closed (deny on any parse problem); a launcher smoke test checks that an allowed and a denied call behave as expected.
- [Env var not inherited] -> the hook denies when `TLT_READ_ALLOW` is empty, so the failure shows up at the first read, not as a wider read.

## Migration Plan

Single repo, local tool: change the server, hook, launchers, skills and tests together, then update `CLAUDE.md`/`README.md`. Rollback is reverting the commits; the data files are untouched.

## Open Questions

- Exact hook input shape for `Read` and `Grep` (field names for the path) - confirm against the Claude Code hooks documentation when writing `guard-read.mjs`; the hook test fixes it once.
