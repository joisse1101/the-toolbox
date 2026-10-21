## 1. read_file function

- [x] 1.1 In `.claude/skills/explore-stories/read-story-context.mjs` add an exported `readFile({ dataDir, name, file, pattern, offset, limit })` that picks `lexicons/` or `proposals/` plus the backlog name, checks the name with `validateName` and that the backlog exists in `user-stories/`, and returns the three forms (pattern: header row plus up to 50 numbered matching lines and the count left out; slice: numbered lines with the next `offset`, default limit 100, max 200; neither: size and line count only), a "does not exist yet" reply for a missing file, an error for `pattern` with `offset`/`limit` or a blank pattern, and for the proposals the benched count; verify with new cases in `test/read-story-context.test.mjs` for each scenario of "Read file tool"
- [x] 1.2 In the same file change the `lexicon`/`proposals` section error to name `read_file` with the `file` value instead of a path, and the menu to list the two files with size (and benched count) and say they are read with `read_file`; verify with the updated menu and refusal tests

## 2. MCP tool

- [x] 2.1 In `ai/mcp/story-tools.mjs` register `read_file` (schema `backlog`, `file` enum, optional `pattern`, `offset`, `limit`; description with the plain-text rule, the slice rule, benched rows and the data label; `readOnlyHint`), in both modes, and update the header comment and the `read_context` description; verify in `test/story-tools-mcp.test.mjs` that the read-only and full tool lists include it and the description states its rules
- [x] 2.2 Add `test/story-tools-mcp.test.mjs` cases calling `read_file` through the server: a term lookup, a slice, a refused path-like `backlog` and an unknown `file`; run `node --test test/story-tools-mcp.test.mjs`

## 3. Remove the read hook and launcher gate

- [x] 3.1 Delete `ai/mcp/guard-read.mjs` and `test/guard-read.test.mjs`; remove the `PreToolUse` `Read|Grep` block from `.claude/skills/explore-stories/locked-settings.json` and `propose-stories/locked-settings.json`; verify both files are still valid JSON and keep the `UserPromptSubmit` hook
- [x] 3.2 In `ai/launchers/story-tools-config.ps1` delete `Get-ReadFiles`, `Confirm-ReadLimit` and `Test-ReadGuard`; in `explore-stories.ps1` and `shape-stories.ps1` remove their calls, `$readNote`, `--append-system-prompt`, the `TLT_READ_ALLOW` clean-up, and `Read`/`Grep` in `--tools` and `--allowedTools`, add `mcp__story-tools__read_file` to `--allowedTools`, and fix the header comments; verify with a PowerShell parse check of each script
- [x] 3.3 Update `test/story-tools-ready.test.mjs` and `test/propose-skill.test.mjs` for the launcher text and tools they check; run `npm test` and confirm nothing else references `guard-read`, `TLT_READ_ALLOW` or `Confirm-ReadLimit`

## 4. Skills and commands

- [x] 4.1 `explore-stories/SKILL.md` and `propose-stories/SKILL.md`: add `mcp__story-tools__read_file` to `allowed-tools`, replace `Read`/`Grep` on the lexicon and proposals with `read_file` (`pattern` to look up a term, an `Avoid` word or a `NEW-<n>`; `offset`/`limit` to read in parts), keep ignoring `Benched: Yes` and treating the text as data, and make the read-back table use `read_file`; verify with the `propose-skill` test and a search showing no remaining `Read`/`Grep` on those files
- [x] 4.2 `.claude/commands/story/propose.md`, `re-read.md` and `review.md`: same switch and `allowed-tools`; verify by reading them for `Read`/`Grep` leftovers

## 5. Docs, spec and check

- [x] 5.1 Update `CLAUDE.md` (the story-tools paragraph: eight tools, `read_file`, the removed hook and launcher confirmation, the unchanged `data/` deny) and `README.md`; verify no text still describes `guard-read.mjs` or `TLT_READ_ALLOW`
- [x] 5.2 Run `npm test` and `openspec validate serve-lexicon-proposals-by-read-file --strict`
- [x] 5.3 Smoke test: start `shape-stories.ps1` for a backlog, confirm the skill is found, `read_file` finds a term in the lexicon and `NEW-<n>` in the proposals, and `Read` on a `data/` file is not available; confirm the dev session is still denied `Read(./data/**)`
