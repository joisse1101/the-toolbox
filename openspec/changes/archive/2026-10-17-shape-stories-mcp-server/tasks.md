## 0. Spike (stop here if it fails)

- [x] 0.1 Build a minimal `ai/mcp/story-tools.mjs` with `read_context` only; confirm it starts on this Node and with the pinned `@modelcontextprotocol/sdk`
- [x] 0.2 Start a session with a trial copy of `shape-stories.ps1` (`--tools "Skill,AskUserQuestion"`, `--mcp-config`, `--strict-mcp-config`, `--allowedTools mcp__story-tools__read_context`) and confirm: the tool and its description are listed, a read runs without a prompt, `Bash` is not available, and a tool left out of `--allowedTools` asks before running
  - Headless trial (`claude -p`, Claude Code 2.1.302, SDK 1.32.1, Node 24.19.0): the tool is listed as `mcp__story-tools__read_context`, the read ran with no prompt, no `Bash` exists. By hand with `--permission-mode default` and no allow list: both `read_context` and a plain tool prompted. In auto mode neither prompts, so the launchers must pin `--permission-mode default`. Spike passed; continue with section 1.
- [x] 0.3 Decide: all four checks pass -> continue with section 1. Any fails -> stop, record the result in `design.md` under Open Questions, and fall back to text-only fixes (restate the review-row rules and the smaller batch rule in `propose-stories/SKILL.md`, keep the Bash guard, apply section 3 skill rules only). `lexicon-change-suggestions` then ships without `suggest_lexicon_change` as an MCP tool and uses a script `suggest-lexicon.mjs` behind the existing guard instead.

## 1. Server

- [x] 1.1 Add `@modelcontextprotocol/sdk` (pinned) to `package.json` and install
- [x] 1.2 Create `ai/mcp/story-tools.mjs`: stdio server, `--read-only` flag, tools `read_context`, `write_proposals`, `write_lexicon`, `write_review` calling `readStoryContext`, `writeProposal`, `writeLexicon`, `writeReview` (`append: true`); `read_context` annotated read-only
- [x] 1.3 Write the tool descriptions and schemas, including the review-row rules (one criterion per row, replace starts with label = position, remove takes label alone, unlock row for locked stories, no add-story or group) and the proposal `dependsOn` forms
- [x] 1.4 Return writer errors verbatim as tool errors; return success lines as text
- [x] 1.5 Tests (`test/story-tools-mcp.test.mjs`): tool list in both modes, a writer call equals the script result, read-only has no writer, bad call writes nothing, `write_review` keeps existing rows, description mentions every review action and field exported by `core/review.js`

## 2. Launchers and settings

- [x] 2.1 `ai/launchers/shape-stories.ps1`: drop `Bash`, add `--permission-mode default` (auto mode would skip the writer prompts), add generated `--mcp-config` + `--strict-mcp-config`, `--allowedTools mcp__story-tools__read_context`, update header comment
- [x] 2.2 `ai/launchers/explore-stories.ps1`: same (including `--permission-mode default`) with `--read-only`
- [x] 2.3 Remove the `hooks` block from both story skills' `locked-settings.json`, keep `claudeMdExcludes`
- [x] 2.4 Delete `.claude/skills/explore-stories/guard-bash.mjs` and `test/guard-story-bash.test.mjs`; leave `review-backlog/guard-bash.mjs` and `test/guard-bash.test.mjs`

## 3. Skills

- [x] 3.1 `explore-stories/SKILL.md`: `allowed-tools` and text refer to `read_context`; add shape-question-first and term-check rules
- [x] 3.2 `propose-stories/SKILL.md`: tools instead of shell commands and heredocs; remove the "follow review-backlog/SKILL.md" pointer and the batch-size/EOF advice; add numbering in write order, one complete text, reprint before writing, split by writer
- [x] 3.3 `.claude/commands/story/propose.md`: same tool names and wording, no yes/no
- [x] 3.4 Update `test/propose-skill.test.mjs` for the new text

## 4. Docs and checks

- [x] 4.1 `CLAUDE.md` and `README.md`: replace the guard paragraphs with the MCP server and tool list
- [x] 4.2 `npm test` passes; start a `shape-stories.ps1` session by hand and confirm the tool list, one read and one confirmed write on a scratch `TLT_DATA_DIR`
- [x] 4.3 `openspec validate shape-stories-mcp-server`
