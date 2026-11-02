# Design

## Context

- See `proposal.md` for the motivation.
- Step 10 of `toolkit/commands/jois-code/apply.md` ("Stop for a commit") hands every group to the `jois-git-commit-hygiene` rule. The rule and its spec say there is no exception.
- The command's `allowed-tools` lists only `git status`, `git diff` and `git add`, so it cannot commit today.
- The command has no way to run tests. `opsx-task-applier` runs commands and reports them, but it is the agent that did the work, so its report is not an independent check.
- The rule is installed as a copy in `~/.claude/rules/`. The repo copy in `toolkit/rules/` is the source.

## Goals / Non-Goals

**Goals:**
- Remove the confirmation stop in the cases where it protects nothing, and only those.
- Keep every doubtful case on today's path.

**Non-Goals:**
- No push, ever, on any branch.
- No change to `/jois-git:stage`, `/opsx:apply` or `/opsx:archive`. They keep the confirmation word.
- No per-project setting for test commands.
- No automatic splitting of a group into several commits.

## Decisions

### 1. The exception is named in the rule and its conditions live in the command

- The rule says one thing: `/jois-code:apply` may commit a finished group without the word on a branch other than `main` or `master`, under the conditions in the command.
- The rule does not restate the conditions.
- Alternative: let any command declare its own exception. Rejected, because every future command could then opt out of the gate.
- Alternative: edit only the command. Rejected, because the rule is loaded in every session and would contradict it.

### 2. Protected branches: `main`, `master`, and anything unreadable

- The command runs `git branch --show-current`.
- An empty result (detached HEAD), `main`, `master` or a failure of the command all count as protected.
- Auto-commit needs a positively named branch that is not protected.
- Alternative: compare with the repo's default branch. Rejected, because it costs another command and a remote lookup for little gain.

### 3. A separate test-runner agent decides the checks

- New agent `opsx-test-runner`: `model: haiku`, tools `Read, Grep, Glob, Bash`, no `Edit` or `Write`.
- It reuses the applier's hook that refuses `git commit`, `git push`, `gh` and `rm -rf`.
- Input: the files the group changed.
- It runs only commands that the project's own instructions name (`CLAUDE.md`, `package.json`, `openspec/config.yaml`), choosing the suites that cover the changed files.
- It never installs anything. Missing dependencies are reported as "could not run".
- Report: per command, the exact command line, the exit code and the counts line as the tool printed it. It also lists the suites it did not run.
- The main session passes the group only when every reported command shows exit code 0. The agent's wording never decides.
- Alternative: the command runs tests itself. Rejected, because it has no test tool and the command would need a per-project setting.
- Alternative: trust the applier's own report. Rejected, because the agent that wrote the change would also grade it.
- The step-8 stall watch also covers the test-runner dispatch.

### 4. One fallback for every doubtful case

Any of these sends the command to today's path (stage, show summary and message, name a confirmation word, end the turn), and the reply says which one applied:

- Protected, detached or unreadable branch.
- Test-runner agent not installed (the message names `Install-Toolkit.ps1`; this differs from the applier, where a missing agent stops the command).
- No test command found, a suite that could not run, a non-zero exit code, or a report with no exit codes.
- A tracked file changed during the test run.
- The group is more than one concern: over about 200 lines or 5 files, or more than one layer (judged from `git diff --stat`).
- Something unrelated is already staged or edited.

Two cases do not fall back:
- A pre-commit hook rejects the commit: stop and report it. Never `--no-verify`, never retry.
- `git commit` fails for any other reason: stop and report the error, because asking for a word would repeat the failure.

### 5. Staging and the message

- Paths come from the group's reports (what the applier changed). The command compares them with `git status` and falls back if anything else is staged or edited.
- It stages with `git add <explicit paths>` and commits once, with no `-a`, no `--amend` and no `--no-verify`. `allowed-tools` is a permission grant, so these limits are written in the command's text.
- The message is `type(scope): subject`, lowercase and imperative, built from the group's heading and tasks.
- After the commit the command prints the short hash and the message, then takes the next group.

### 6. Front matter

- `allowed-tools` gains `Bash(git commit:*)` and `Bash(git branch --show-current:*)`.
- `git push` stays out of `allowed-tools`, so an attempt still raises a prompt.
- Version 1.1.0 to 1.2.0 and the description says the command commits unprotected branches by itself.
- The rule goes 1.2.1 to 1.3.0 and the new agent starts at 1.0.0, all with `last_updated: 2026-11-02`.

## Risks / Trade-offs

- [An old installed rule still says "never commit"] → Document that the installer must be re-run. The rule's version bump makes the stale copy visible.
- [Haiku picks the wrong test suite] → It lists the suites it did not run, and a missing or unclear result falls back to asking.
- [Tests write files, such as snapshots, that the commit then misses or includes] → A changed tracked file after the run falls back to asking.
- [A test run waits on a permission prompt] → The same stall watch as step 8 applies.
- [A wrong auto-commit on a feature branch] → Local only and reversible with `git reset`. The command never pushes.
- [`operations.apply.guidance` in `openspec/config.yaml` still says to name a confirmation word] → The applier never commits, so it is unaffected. See Open Questions.

## Migration Plan

- Re-run `Install-Toolkit.ps1` for the rule and `-Agent opsx-test-runner.md` for the agent.
- Rollback: revert the change. `git revert` of the commit restores the old rule, command and specs.

## Open Questions

- Should `/jois-init:opsx` reword the managed `operations.apply.guidance` line? It does not affect this change and can be decided later.
