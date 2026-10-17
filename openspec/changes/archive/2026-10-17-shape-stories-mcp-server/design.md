## Context

The two story sessions run Claude with `--tools "Bash,Skill,AskUserQuestion"` and a PreToolUse hook (`explore-stories/guard-bash.mjs`) that allows exact script lines. The scripts already export the functions that do the work (`readStoryContext`, `writeProposal`, `writeLexicon`, `writeReview`), so the shell layer adds only a parsing surface: a regex guard, a heredoc, and SKILL.md prose that has to describe every key. Observed failures: the row rules for `write-review.mjs` live in `review-backlog/SKILL.md`, which the guard blocks; heredocs fail with `unexpected EOF` on long JSON, which is why SKILL.md says "batches of 3-4".

## Goals / Non-Goals

**Goals**
- The agent sees each tool's rules (description + schema) without reading a file.
- No shell in the story sessions; same write safety as today (confirm prompt, all-or-nothing writers).
- Scripts keep working from the command line.

**Non-Goals**
- No change to `review-backlog` (its own session, guard and scripts).
- No change to the data model, `core/`, or what the writers validate.
- Lexicon rename/delete (separate change `lexicon-change-suggestions`).

## Decisions

**1. Stdio MCP server in `ai/mcp/story-tools.mjs`, using `@modelcontextprotocol/sdk`.**
`ai/` already holds the launchers and guidelines; `.claude/skills/` would imply a skill. The dependency direction stays one way (`ai/mcp` -> skill scripts' exported functions -> `core/`). Alternative: hand-rolled JSON-RPC over stdio with built-ins only. Rejected: the repo's built-ins-only rule is for `app/backend/server.cjs`; the SDK gives schema validation and spec conformance for one dev dependency.

**2. Tools wrap the existing functions; no logic moves.**

```
agent --call--> story-tools.mjs --import--> readStoryContext / writeProposal /
                  (zod schema,               writeLexicon / writeReview
                   descriptions)                       |
                                                       v
                                                     core/
```

`write_proposals` and `write_lexicon` take the item list as a structured argument (`items`), and the tool serialises it to the JSON string the functions already accept, so the writers' own error text and positions are unchanged. `write_review` passes `append: true` always.

**3. Rules live in the tool descriptions, once.**
The review-row rules (one criterion per row, `replace` starts with the label = position, `remove` takes the label alone, `unlock` row for a locked story, no `add-story`/`group`) are written in the `write_review` description. `propose-stories/SKILL.md` stops saying "follow review-backlog/SKILL.md" and points to the tool description. `review-backlog/SKILL.md` keeps its own copy for the audit session; the two are checked by a test that the description mentions the same labels the writer's messages use (see tasks).

**4. Permissions through the launcher, not a hook.**
`--tools "Skill,AskUserQuestion"` plus `--mcp-config <file> --strict-mcp-config`; `--allowedTools "mcp__story-tools__read_context"`. The writers are not allowed, so Claude Code prompts. `read_context` has `readOnlyHint: true`. The launchers generate the config path from the repo root (`node` + absolute script path), so no machine path is committed. `explore-stories.ps1` passes `--read-only`, so the writers do not exist in that session at all.

**5. `locked-settings.json` keeps only `claudeMdExcludes`.** The Bash `hooks` block goes; the guard file and `test/guard-story-bash.test.mjs` are deleted. `review-backlog/guard-bash.mjs` is untouched.

**6. Skill text changes are behavioural rules, not new files.** `explore-stories`: ask the shape-deciding question first; check a new/renamed term against terms and Avoid lists and list affected definitions/stories (using `read_context` sections `lexicon` and `index`; story text is searched only in the index columns). `propose-stories`: number drafts in write order, one complete final text before the yes/no, no "as before", reprint drafts in the turn that writes, split by writer when the text is long. `/story:propose` (`.claude/commands/story/propose.md`) follows the same wording without the yes/no.

## Risks / Trade-offs

- **SDK dependency and its transitive packages** -> pin the version; the server is dev-tooling only and never loaded by the portal.
- **Tool schema duplicates writer validation** -> keep the schemas loose on content (the item shape and enums) and let the writer remain the authority; a rejected call returns the writer's messages.
- **MCP tools need `claude` to start the server** -> if it fails to start the session has no data tools; the launchers print the `node ai/mcp/story-tools.mjs` command to run by hand to see the error.
- **Description drift vs `review-backlog/SKILL.md`** -> test compares the actions/fields lists exported from `core/review.js` against the description text.
- **Truncated confirmations** are a model-output problem, mitigated only by the split-by-writer rule in the skill text.

## Migration Plan

1. Add the server and tests; keep Bash path working.
2. Switch the two launchers and skills; remove the guard, its test and the hook.
3. Update `CLAUDE.md` and `README.md`.
Rollback: restore the launchers' `--tools` line and the hook entry; the scripts were never removed.

## Open Questions

- None blocking. Whether `review-backlog` should move to the same server later is deferred.
- Spike result (Claude Code 2.1.302, SDK 1.32.1, Node 24.19.0): all assumptions held. With `--permission-mode default` an MCP tool outside `--allowedTools` prompts; with it in `--allowedTools` it runs silently; `Bash` is absent. Auto mode skips all prompts, so the launchers pin `--permission-mode default`. Original assumptions, checked by the spike (tasks 0.1-0.3): this Node runs the SDK server; this Claude Code version honours `--mcp-config` with `--strict-mcp-config` and a `--tools` list without `Bash`; an MCP tool outside `--allowedTools` prompts. Fallback if the spike fails: keep the Bash guard and fix only the text (restate the review-row rules in `propose-stories/SKILL.md`, smaller batches, the skill process rules).
