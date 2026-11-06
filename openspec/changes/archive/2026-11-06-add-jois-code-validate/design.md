# Design

## Context

`/jois-code:apply` is the model to copy. It is a command that only orchestrates, hands work to agents, and judges their results by exit codes. See proposal.md for why validate exists and `specs/code-validation/spec.md` for the required behavior.

Two limits shape the approach. An agent cannot ask the user anything, so every decision stays in the command. And the slice folder is not tracked by git here, so a result file written there stays local.

## Goals / Non-Goals

**Goals:**
- One command, one tester agent, one result file.
- Reuse the plan skill's stale check, `opsx-test-runner` and `playwright-cli` instead of writing new ones.

**Non-Goals:**
- No fixing of failures. Validate reports and stops, because fixing is apply's job.
- No code review. That is the built-in `code-review` skill, wrapped by PR 7.
- No real sandbox. A checkout is not one.

## Decisions

**The command orchestrates, a read-only agent tests.** The new agent `code-validator` has the tools `Read`, `Grep`, `Glob` and `Bash`, with no `Edit` or `Write`. The same hook as `opsx-task-applier` blocks `git commit`, `git push`, `gh` and `rm -rf`. The command alone writes the result file. This keeps the one write outside the checkout in one place. The alternative, giving the agent `Write`, would let a test run alter the code it is judging.

**One agent run per group of claims.** The command groups claims by kind (UI, backend, end to end) and dispatches one background agent per group, with the watch step that apply uses for stalls. A single agent for everything would blow its turn limit on a big slice.

**Suites go through `opsx-test-runner`.** The tester does not invent test commands. For a backend claim the command dispatches the runner on the checkout and judges its exit codes, never its wording, as apply does.

**The checkout is a git worktree under `.scratch/`.** The command creates it from the branch or from the PR head (`gh pr checkout` is read-only for the remote), installs locally as the repo's install rule says, and removes it at the end. Alternative: test in the working tree. Rejected, because a run could leave files in the user's work.

**Foreign PRs ask first.** The author is compared with the current git user. On any doubt the command asks. This is a prompt and not a guard, and the command text says so.

**One result file, `validation.md`, in the slice folder.** It has a header (run kind full or partial, date, commit tested) and one row per claim: id, source, verdict, evidence. Each run overwrites it, so it always describes the latest run. Archive reads the header and the verdicts and applies the rule in the spec. A partial run overwriting a full one would hide a validated slice, so a partial run writes `validation.partial.md` instead and leaves `validation.md` alone.

**Claims are extracted by the command, not by a script.** The slice's `tasks.md` has a fixed format, so a task's `Satisfies:` rows are parsed from it. Stories come from the plan skill's `read-diagrams.mjs` output and the story reader. PR claims are read from `gh pr view` and `gh issue view`, which are read-only. The extraction is model work and can miss a claim, so the report prints the claim list before testing, and the user can stop the run.

## Risks / Trade-offs

- [A foreign PR runs arbitrary code] → The confirmation prompt, the checkout under `.scratch/`, mock data only, and a plain statement that it is not a sandbox. A hostile PR can still harm the machine, so the command suggests a separate machine or container for untrusted code.
- [A claim is missed or vaguely worded] → The claim list is shown before testing. A claim too vague to test becomes `could not test`.
- [Evidence is the agent's report] → Verdicts for suites come from exit codes of the runner. A UI verdict rests on the agent's account of what the browser showed, so it quotes the page text it saw.
- [The result file goes stale after more code changes] → The header holds the tested commit, and archive compares it with the current one.
- [Validate and apply disagree on a slice] → Validate never edits `tasks.md`, so apply's ticks stay as they are.

## Open Questions

- Whether the result file should list claims by stable id across runs, so archive can diff runs. Safe to decide later, because archive only needs the latest run.
