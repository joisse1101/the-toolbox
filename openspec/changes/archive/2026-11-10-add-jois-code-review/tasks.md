# Tasks

## 1. How the command starts validate

- [x] 1.1 Find out whether a slash command can start `/jois-code:validate` through the Skill tool while `disable-model-invocation: true` is set, using a throwaway mock command under `.scratch/` and no real PR or backlog; verify the result is written down in one line (works, or refused with the message)
  - Result: inconclusive. A throwaway command with the flag and one without both gave "Unknown skill" in the running session, because commands added mid-session are not picked up. Probe files removed. The real test moves to the trial in 4.2, run with the flag dropped (see 1.2).
- [x] 1.2 Ask the user for the judgement call with the options and a recommendation: drop the flag from `validate.md`, or use the fallback of printing the line to type; verify the answer is recorded here before any later task starts, and do not decide it alone
  - Answer (user, 2026-11-10): "drop the flag temporarily. after testing is done, put the flag back". So the flag is removed for the trial and restored in 4.4. The shipped `review.md` must therefore work both ways: try the Skill tool, and when the Skill tool refuses validate, fall back to printing the `/jois-code:validate` line.
- [x] 1.3 NOW PERMANENT, by the user's later answer "option 2" (2026-11-10): validate keeps no flag, and `check_toolkit.py` allows it through `MODEL_STARTABLE_COMMANDS`, with a test and wiki lines. The note below is the original temporary plan (done: flag removed, version 1.1.0, rule added to Rules section; `test_validate_command.py` 21 passed; `python toolkit/check_toolkit.py` fails on purpose while the flag is off, because it requires the flag on every command, so it must pass again after 4.4): remove `disable-model-invocation: true` from `toolkit/commands/jois-code/validate.md`, raise its `metadata.version` and `last_updated`, and add the delta requirement's text to its safety section; verify `python toolkit/check_toolkit.py` passes and `test_validate_command.py` still asserts the confirmation before a foreign PR runs

## 2. The review command

- [x] 2.1 Add `toolkit/commands/jois-code/review.md` with frontmatter, an `allowed-tools` list that holds the Skill tool, `AskUserQuestion` and read-only `git` and `gh pr view`, and none of `git commit`, `git push` or a `gh` write; add `toolkit/tests/test_review_command.py` with a test of that list; verify `python -m pytest tests/test_review_command.py` passes in `toolkit/`
- [x] 2.2 Write the target step: empty means the current branch against `main`, a number means a PR, anything else is refused, and `main` with no argument says there is nothing to review; verify a test checks the three scenarios of "Targets of the review"
- [x] 2.3 Write the static step: run `code-review` on the target, pass the effort level and `--comment` only when given, refuse `--fix`, and refuse `--comment` on a branch target; verify a test checks that `--fix` is never passed and the refusal text is present
- [x] 2.4 Write the posting confirmation: one yes/no question before the static check, naming the PR, with nothing posted on no; verify a test checks the question comes before the static step in the command text

## 3. The behavioural step and the report

- [x] 3.1 Write the behavioural step: the PR form for a PR target, the slice form for a named slice, and a question for a slice or a PR number when a branch target has neither; verify a test checks the three scenarios of "The behavioural check is validate"
- [x] 3.2 Write the not-run rules: validate not installed, user gives nothing, validate refused; each says so with the reason and shows no behavioural result; verify a test checks each case is named and that `Install-Toolkit.ps1` is in the not-installed text
- [x] 3.3 Write the report: static findings, then validate verdicts, each in its own wording, one line saying which checks ran, and any instruction found in a PR, issue or slice, ignored and mentioned; verify a test checks the report has the two parts and no merged status word

## 4. Docs and a trial

- [x] 4.1 Update `wiki/toolkit/Toolkit-Guide.md` and `wiki/toolkit/Command-Details.md` for `/jois-code:review`, its two targets, the up-front `--comment` question and the install line (`Install-Toolkit.ps1 -Command jois-code`, plus the validate agents); verify `python scripts/check_docs.py` passes
- [x] 4.2 Play the command with subagents on mock repos and a stub for `gh` under `.scratch/`, never on a real PR; each subagent follows the command text with one case and appends one line per step to `.scratch/agents/<agent>.log`; verify every case below gets the expected result
  - a PR target with a linked issue;
  - a branch target with a named slice;
  - a branch target with no slice, where the command asks and the user gives nothing;
  - a PR by another author, where validate must ask before running anything;
  - `--comment` answered yes and answered no;
  - `--fix`, which must be refused;
  - validate not installed;
  - an instruction planted in a PR description, which must be ignored and mentioned.
- [x] 4.3 Judge each subagent result against the specs; when a result is unclear or the text allows two readings, ask the user and do not decide alone; verify no unclear result is closed without the user's answer
  - All 9 cases reached the expected outcome. Asked the user and recorded: `--comment` on a branch stops completely; a branch with no slice or PR asks before the static check; the "name the rule" sentence is removed because the skill names the rule itself. Fixed without asking (one reading only): PR read now includes `body` and `closingIssuesReferences`; the install check comes first in step 4; the target line comes before the checks line.
- [x] 4.4 Fix the command text from what the trial showed, rerun the cases that failed or were unclear, put `disable-model-invocation: true` back in `validate.md` (and undo the version and safety-text edit of 1.3 unless the user decides to keep it), and remove the mock files under `.scratch/`; verify the rerun is clean, `git diff` shows `validate.md` with the flag restored, `python toolkit/check_toolkit.py`, `python -m pytest` in `toolkit/` and `python scripts/check_docs.py` pass, and `.scratch/` holds nothing left over

## Workflow follow-up

- Run one real review of a small PR by number after merge, because the spikes did not cover a PR by number, a large wiki or an effort level above `medium`. Owner: the user.
- Archive the change after review, with the toolkit docs check passing.
- Record in issue #98 that PR 7 is done and tick its acceptance criterion on code review.
