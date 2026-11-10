# Design

## Context

`/jois-code:validate` is the model to copy: a command that only orchestrates, has a fixed `allowed-tools` list, and is tested by reading its text (`toolkit/tests/test_validate_command.py`). See proposal.md for why the review command exists and `specs/code-review-command/spec.md` for the required behavior.

Two facts shape the approach. First, `validate.md` and `apply.md` set `disable-model-invocation: true`, so the model cannot start them by itself, only the user can type them. Second, the built-in `code-review` skill posts to GitHub by itself when it is given `--comment`, so the only safe place to ask for confirmation is before it starts.

## Goals / Non-Goals

**Goals:**
- One command file and one test file, with no new agent and no new script.
- Reuse `code-review` and `validate` as they are.

**Non-Goals:**
- No change to how `code-review` finds rules. The spikes showed it already reads `CLAUDE.md`, `.claude/rules/` and the wiki.
- No branch form of validate. A branch with no named slice asks for a slice or a PR, as the user decided.

## Decisions

**The command only orchestrates.** It resolves the target, calls the two checks and prints the report. It has no `Edit`, no `git commit`, no `git push` and no `gh` write in `allowed-tools`. Reads such as `gh pr view` and `git rev-parse` are allowed. This keeps the one outward-facing write inside `code-review --comment`.

**Target resolution.** An empty argument means the current branch against `main`, read with `git branch --show-current`. A number means a PR. Anything else is refused. On `main` there is nothing to review, so the command says so.

**Intent for validate is asked, never guessed.** For a PR target the PR is the intent. For a branch target the user must name a slice or a PR number, and the command asks when neither was given. This is the same rule validate applies to an unclear argument. If the user gives nothing, the report holds the static findings and says the behavioural check did not run. Alternative: give validate a third form for a branch. Rejected, because it changes PR 6 and a branch has no description to read.

**`--comment` is confirmed up front.** Because `code-review --comment` posts as it goes, a confirmation after the report is too late. The command asks one yes/no question before the static check, names the PR and says the findings will be posted as inline comments. Alternative: run the static check without `--comment`, then ask, then run it again. Rejected, because a second run is slow and may find different things than the one the user read. The cost is that the user confirms before seeing the findings. A branch target has no PR to post to, so `--comment` there is refused with a one-line reason.

**How the command starts validate.** Preferred: the Skill tool, with the argument of the chosen form. This needs validate to drop `disable-model-invocation: true`. That flag is a guard against the model running code by itself, so dropping it is a safety trade. It is acceptable only because validate asks the user before running someone else's PR and prints its claim list before any test, and the spec requires the review command to leave both prompts to the user. Fallback, if the first task shows a command cannot be started this way: print the static report, then tell the user the exact `/jois-code:validate` line to type, and say plainly that the behavioural check was not run. The report text is the same in both cases, so the spec does not depend on the mechanism.

**One report, two parts.** The static findings keep the wording of `code-review`. The validate verdicts keep `met`, `not met` and `could not test` with their evidence. The command does not compute a single pass or fail, because the two checks measure different things and a merged status would hide which one failed.

**Install and docs.** The installer finds commands by folder, so `toolkit/commands/jois-code/review.md` needs no list edit. The wiki pages `Toolkit-Guide` and `Command-Details` get the new command, and the install line names the validate command and its two agents as the dependencies.

## Risks / Trade-offs

- [Dropping the model-invocation guard on validate lets a model start it unprompted] → validate's own confirmation for someone else's PR and its printed claim list stay. The first task tests it, and the fallback above avoids the change if the trial is not clean.
- [Confirming `--comment` before the findings exist] → The question names the PR and the action. The user can answer no and post later.
- [The built-in skill changes its arguments or output] → The test checks the command text for the arguments it passes. The report quotes the skill's output and does not parse it.
- [Spikes were one run at medium effort on small repos] → A PR by number, a large wiki and higher effort are untested. The last task runs one mock PR and says what was not covered.
- [Reviewing someone else's PR runs their code through validate] → No new way to run code is added. The validate safety rules apply as they are, and the command says a checkout is not a sandbox.

## Open Questions

- Whether `/jois-code:review` should name the effort level in its report. Safe to decide later, because it changes no behavior.
