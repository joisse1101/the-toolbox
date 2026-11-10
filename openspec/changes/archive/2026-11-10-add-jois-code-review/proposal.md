# Proposal

## Why

Nothing checks a PR, or the current branch, against the repo's rules and against what it claims to do, in one step. The built-in `code-review` skill checks code against `CLAUDE.md`, the rules and the wiki, and `/jois-code:validate` tests the claims of a slice or a PR, but a reviewer must run both by hand and merge two reports. This is stage 8 of the story-to-code pipeline in issue #98 (PR 7 of the plan), reshaped in the issue comment "PR 7 changes shape".

Three spikes of the built-in skill on mock repos found every planted problem, with the rule or wiki page cited. So the new command must not re-implement the static check. It wraps it.

## What Changes

- Add the command `/jois-code:review`. It resolves its target, runs the built-in `code-review` skill (the static check), runs `/jois-code:validate` (the behavioural check) and prints one report.
- Take the target as a PR number or as the current branch against `main`.
- Take the intent for the behavioural check from a PR (its description and linked issue) or from a slice. When the target is the current branch and the user named neither, ask for a slice or a PR number and run nothing behavioural until the user answers. If the user does not give one, print the static report and say the behavioural check was not run.
- Pass the effort level and `--comment` through to `code-review`. Never pass `--fix`. Ask the user once, before anything is posted to GitHub.
- Never report a behavioural pass that was not run. A half that could not run is named in the report, with the reason.
- Let the review command run validate. Validate keeps every rule it has, including the confirmation before it runs someone else's PR. The review command never answers that confirmation for the user.

Not in this change: a new static-check engine, any edit of the code under review, `--fix`, archive (PR 8) and a branch form of validate.

## Capabilities

### New Capabilities
- `code-review-command`: the `/jois-code:review` command, its targets, the two checks it runs, the one report it prints, and the rules for posting to GitHub and for a check that did not run.

### Modified Capabilities
- `code-validation`: validate can be started by the review command and still asks for the user's confirmation for a PR that is not the user's own.

## Impact

- New `toolkit/commands/jois-code/review.md`, and a small change to `toolkit/commands/jois-code/validate.md` if the design's first task shows the review command cannot start validate otherwise.
- New test `toolkit/tests/test_review_command.py`, in the style of `test_validate_command.py`.
- Wiki pages under `wiki/toolkit/` (`Toolkit-Guide`, `Command-Details`), updated in the same change. `python scripts/check_docs.py` must pass.
- No change to `planner/`, to the agents, or to the installer, which finds commands by folder.
- Risk: the review of someone else's PR runs their code through validate. The existing validate safety rules are the answer, and this change adds no new way to run code.
