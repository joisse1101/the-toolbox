# Tasks

## 1. The tester agent

- [x] 1.1 Add `toolkit/agents/code-validator.md` with `name`, `description`, tools `Read, Grep, Glob, Bash`, a turn limit and the `PreToolUse` hook that blocks `git commit`, `git push`, `gh` and `rm -rf`; verify `python toolkit/check_toolkit.py` accepts it (result: `python check_toolkit.py` -> toolkit check passed)
- [x] 1.2 Write the agent's report format (one verdict per claim, with command, exit code or quoted page text, and a `could not test` reason) and add `toolkit/tests/test_code_validator.py` that checks the tool list, the hook and the report parts; verify `python -m pytest toolkit/tests/test_code_validator.py` passes (result: `.venv/Scripts/python.exe -m pytest tests/test_code_validator.py` -> 18 passed)

## 2. The validate command, slice form

- [x] 2.1 Add `toolkit/commands/jois-code/validate.md` with frontmatter, the two forms, the refusal of an unclear argument and the optional story ID; verify `python toolkit/check_toolkit.py` passes (result: `check_toolkit.py` -> toolkit check passed)
- [x] 2.2 Add the slice steps: run the plan skill's `read-diagrams.mjs` and stop on a stale, missing or ambiguous slice, then build and print the claim list from `tasks.md` and the stories; verify a test checks the command text names each stop condition (result: `pytest tests/test_validate_command.py` -> 13 passed)
- [x] 2.3 Add the single-story filter and the unknown-story refusal; verify a test checks both scenarios of the spec (result: `pytest tests/test_validate_command.py` -> 13 passed, incl. single-story and unknown-story tests)

## 3. Testing, verdicts and the result file

- [x] 3.1 Add the throwaway checkout steps: create under `.scratch/`, install locally only, mock data only, remove at the end, and stop before any real system; verify a test checks each rule is in the command text (result: `pytest tests/test_validate_command.py` -> 13 passed)
- [x] 3.2 Add the dispatch steps: group claims by kind, run the tester agent in the background with the stall watch, run `opsx-test-runner` for suites and judge by exit codes only; verify a test checks the exit-code rule and the `could not test` rule (result: `pytest tests/test_validate_command.py` -> 13 passed)
- [x] 3.3 Add the result file steps: write `validation.md` for a full run and `validation.partial.md` for a partial run, with the run kind, date, tested commit and one row per claim; verify a test checks that a partial run never writes `validation.md` (result: `pytest tests/test_validate_command.py` -> 13 passed)
- [x] 3.4 Add the rule for what counts as validated, in the command text and the result file header; verify a test checks that one `could not test` or a partial run is not validated (result: `pytest tests/test_validate_command.py` -> 13 passed)

## 4. The PR form and its safety

- [x] 4.1 Add the PR steps: read the PR and its linked issue with `gh pr view` and `gh issue view` only, use the description alone when no issue is linked, and print the report without writing a file; verify the command's `allowed-tools` holds no `gh` write and no `git push` (result: allowed-tools test -> only `gh pr view` and `gh issue view`, no `git push`; 13 passed)
- [x] 4.2 Add the confirmation for a PR whose author is not the current git user, with the plain statement that a checkout is not a sandbox; verify a test checks the command asks and runs nothing before the yes (result: `pytest tests/test_validate_command.py` -> 13 passed)

## 5. Install, docs and integration

- [x] 5.1 Register the new command and agent where the installer and `check_toolkit.py` list them; verify `python toolkit/check_toolkit.py` and `python -m pytest` in `toolkit/` pass (result: agents and commands are found by glob, so no list edit; `check_toolkit.py` -> passed; `pytest` in toolkit -> 170 passed)
- [x] 5.2 Update `wiki/toolkit/Toolkit-Guide.md`, `Command-Details.md` and `Task-Agent.md` for the command, the agent and the result file; verify `python scripts/check_docs.py` passes (result: `python scripts/check_docs.py` -> docs check passed)
- [x] 5.3 Run the command on a mock slice and a mock PR under `.scratch/` with one planted failing claim and one claim that cannot be tested; verify the report marks them `not met` and `could not test`, the code is unchanged, and no file is written for the PR (result: slice case A -> C2 `not met` (exit code 1), audit claim `could not test`, repo clean; PR cases E, G, H -> no file written; the planted failing claim was not exercised on a PR, only on a slice)

## 6. Evaluate the command with subagents

- [x] 6.1 Play the command with subagents on mock repos, slices and PRs under `.scratch/`, never on a real backlog or a real PR; each subagent follows the command text with one planted case and appends one line per step to `.scratch/agents/<agent>.log`; verify every case below gets the expected result (result: 8 cases played by subagents on mocks under `.scratch/`; A, B, C, D, F, H as the spec requires; E and G tested nothing until the user decided PR-added tests count)
  - a claim that is met, one that is not met and one that cannot be tested;
  - a stale slice;
  - a single-story run, and a story ID that is not in the slice;
  - a PR with no linked issue;
  - a PR by another author, where the command must ask before running anything;
  - a claim that needs a real external system;
  - an instruction planted in a PR description or a slice, which must be ignored and mentioned;
  - a partial run after a full run, where `validation.md` must stay as it was.
- [x] 6.2 Judge each subagent result against the spec; when a result is unclear, or the command text allows two readings and the spec does not decide between them, ask the user for the judgement call with the options and a recommendation, and do not decide it alone; verify no unclear result is closed without the user's answer (result: user asked 4 judgement calls and answered all; none closed without an answer)
- [x] 6.3 Fix the command text from what the trial showed, rerun the cases that failed or were unclear, and remove the mock files under `.scratch/`; verify the rerun is clean, `python toolkit/check_toolkit.py`, `python -m pytest` in `toolkit/` and `python scripts/check_docs.py` pass, and `.scratch/` holds nothing left over (result: reran C, E, F, G clean; `pytest` in toolkit -> 179 passed; `check_toolkit.py` and `check_docs.py` passed; `.scratch/` empty)

## Workflow follow-up

- Archive the change after review, with the toolkit docs check passing.
- Record in issue #98 that PR 6 is done, and tick its acceptance criterion on validate.
