# Design

## Context

Three always-loaded rules exist for actions that touch no code file: `jois-git-commit-hygiene`, `jois-test-mock-data` and `jois-env-local-installs`. None says where Claude puts files it creates, and `jois-env-local-installs` leaves a gap that Claude fills by asking. The harness also names a scratchpad in the system temp folder, and subagent transcripts live in `~/.claude/projects`, where reads outside the repo are blocked.

## Goals / Non-Goals

**Goals:**
- Claude has no reason to touch anything outside the repo.
- One place for files Claude creates, easy to ignore in git and to delete.
- A way to follow a subagent without reading its transcript.

**Non-Goals:**
- No hook or permission setting that enforces any of this. A rule is guidance.
- No change to the permission prompts of Claude Code.
- No move of the transcripts. They stay outside for security.

## Decisions

- **One new rule, `jois-env-stay-in-repo`, not a bullet in the mock-data rule.** Scratch files and agent notes are not about mock data. The mock-data, installs and commit rules point to it and do not restate it. Alternative: put everything in the mock-data rule; rejected because progress notes have nothing to do with it.
- **Folder name `.scratch/` at the project root.** It names its purpose and is not used by any tool here. `.trees/` (worktrees) is already git-ignored in this repo, and `.scratch/` is added next to it. In another project the rule asks Claude to add the entry when missing. Each worktree has its own, so nothing is shared across checkouts.
- **Progress notes are step-based, not timed.** An agent has no clock. It appends one line after each step, such as `task 3 of 7 done, running tests`. Alternative: timestamps; rejected because the agent cannot read the time reliably.
- **Only agents that can write files log.** `opsx-task-applier` and `opsx-test-runner` can. The read-only reviewers cannot, so the main session waits for their report. The rule says so, so Claude does not try to read their transcript.
- **The rule outranks the harness scratchpad.** User rules take precedence over the harness defaults, and the rule says it outright.
- **A missing environment is not a failing check.** The commit rule forbids committing while checks fail. Claude read "cannot run" as "failed", so the commit rule states the difference and points to the installs rule.
- **Asking stays only for a tool with no local install.** This keeps the guard for the case it was written for.

## Risks / Trade-offs

- **Context cost:** another always-loaded block. Mitigated by keeping the rule short.
- **Guidance only:** Claude can still err. A hook that blocks writes outside the repo would be a follow-up if it recurs.
- **Tools with a fixed temp folder:** some tools ignore a redirect. The rule says "where the tool allows it", so a few files can still land outside.
- **`.scratch/` left behind:** cleanup is a rule, not enforced. The folder is git-ignored, so leftovers add no noise to commits.
- **Existing rule wording unchecked:** the exact text of the four rule files was read for this change; the edits are written against it.
