## Context

- `plan-stories.ps1` builds its MCP config with `New-PlanStoriesConfig`, which starts `backlog-tools.mjs --read-only`. In that mode `createServer` skips `check_drafts` and the four writers, so `propose-stories` has no tools in a plan session even though the skill is listed there. See proposal.md for the issue.
- `shape-stories.ps1` already runs `explore-stories` and `propose-stories` in one session with the full server, pre-approving only the tools that write nothing. That is the pattern to copy.
- The story writers write only `proposals/`, `reviews/`, `lexicons/` and `lexicon-suggestions/`; none writes `backlogs/`. A story changes only when the user applies a review row or accepts a proposal in the portal.
- A skill's `allowed-tools` only pre-approves tools; it does not make them exist. Availability comes from the launcher (`--tools`, `--mcp-config`) alone.

## Goals / Non-Goals

**Goals:**
- A plan session can fix a story conflict through `propose-stories` without leaving the session.
- A skill invoked without the tools it needs fails at the first step with a message that names the fix, not at the last step.

**Non-Goals:**
- The plan-stories skill does not call a story writer itself, and does not gain any write path to `backlogs/`.
- No change to `backlog-tools.mjs`, the writers' validation, the portal, or `diagram-tools`.
- No flag to switch the plan session back to read-only (see Decisions).

## Decisions

**1. Full `backlog-tools` in the plan session, no flag.** `New-PlanStoriesConfig` drops `--read-only`; `plan-stories.ps1` adds `mcp__backlog-tools__check_drafts` to `--allowedTools` and leaves the four writers out, so Claude Code prompts before each one. Alternatives: a `-Write` opt-in flag keeps the old default but means the issue recurs for anyone who forgets it, and every write is already gated twice (the skill's yes/no and the permission prompt); keep read-only and only add the fail-fast message (option A in the discussion), which does not let the user fix a conflict where they found it.

**2. The boundary moves from tool absence to the skill's own rule.** The plan-stories skill is told it never calls a story writer; story changes are handed to `propose-stories`. The rule becomes prompt-enforced, which is acceptable because the writers cannot reach `backlogs/` and every write is prompted. The plan-stories skill's `allowed-tools` stays as it is (readers and diagram tools): it must not pre-approve `check_drafts`, since the launcher already does for the session, and the skill does not use it.

**3. Fail-fast check by tool presence, in the skill text.** `propose-stories` and `/story:propose` open with a step: if `check_drafts` or any of the four writers is not among your tools, stop and say the session is read-only. The agent can tell from its own tool list, so no code is needed. `/story:review` writes nothing, so it only skips its `check_drafts` step and says so, rather than refusing the whole audit.

**4. Handoff wording lives in the plan-stories skill.** After a conflict is found it offers `propose-stories` or an `Open questions` entry, and after a write it states that Apply or Accept in the portal is needed and that the slice goes STALE. `read_diagrams` already reports changed, missing and new stories as stale, so no stale logic changes. The skill reads the backlog as it is now, so an unapplied review row is not drawn.

## Risks / Trade-offs

- [A planning session now holds writers, so a prompt injection in story or repo text could try to call one] → Writers are never pre-approved, so each call prompts the user; repo and CSV text are already labelled as data; writers cannot write `backlogs/`.
- [The agent might call a writer directly from the plan skill, skipping `propose-stories`' checks and yes/no] → The skill text forbids it and routes through `propose-stories`; the permission prompt is the backstop. A text check in the skill tests can assert the rule is stated.
- [Two skills in one context make it long, and plan-stories drafts need the same story reads `propose-stories` repeats] → `propose-stories` already re-reads at the start of every use, so no stale context is reused; accept the extra reads.

## Migration Plan

No data or config migration. The launcher change takes effect on the next session start. Rollback is restoring `--read-only` in `New-PlanStoriesConfig` and the old `--allowedTools` list.
