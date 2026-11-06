# Proposal

## Why

Nothing today judges whether the code that apply wrote does what the plan said. `/jois-code:apply` runs the tests, but a green test suite does not show that each requirement of a slice is met. This is stage 7 of the story-to-code pipeline in issue #98 (PR 6 of the plan).

The built-in `code-review` skill already checks code against rules and the wiki. Validate is the other half: it tests behavior, so a reviewer, and later archive (PR 8), can see which requirements are met, with evidence.

## What Changes

- Add the command `/jois-code:validate`. It turns an intent into a list of claims and tests each one in a throwaway checkout, then reports each claim as met, not met or could not test, with evidence.
- Take the intent from one of two sources:
  - A slice, `slice <backlog>/<slice>`. The claims come from the `Satisfies:` and `Verify:` lines of its tasks and from the acceptance criteria of its stories, so the stories are covered with the slice.
  - A PR and its linked issue, given as a PR number. The claims come from the PR description and the issue. Someone else's PR has no slice, so this source must work without one.
- Let the user name one story ID inside a slice to check only that story's claims.
- Write a result file into the slice folder after a slice run. It records every claim checked, its verdict and its evidence, and whether the run was a full run or a single-story run. Archive (PR 8) will count a slice as validated only after a full run with every claim met. A PR run is printed and writes no file.
- Add one tester agent that does the testing. It reuses `opsx-test-runner` for suites and `playwright-cli` for a UI change.
- Make running someone else's code safe by default: a throwaway checkout under `.scratch/`, local installs only, mock data only, a stop before any real system, and an explicit confirmation before running a PR that is not the user's own. The command says plainly that a checkout is not a sandbox.
- Stop on a stale slice by running the plan skill's `read-diagrams.mjs`, as apply does.

Not in this change: the `jois-code review` wrapper (PR 7), archive (PR 8), any edit of the code under test, and any commit, push or GitHub write.

## Capabilities

### New Capabilities
- `code-validation`: the behavioural check of a slice, or of a PR with its issue, against the code, with a per-claim verdict, its evidence, the stored result file and the safety rules for running the code.

### Modified Capabilities

None. The new command and agent are listed in the toolkit's install and wiki pages, which are documentation and installer data and not spec-level behavior to change here. The design checks whether the `toolkit-skills` requirement on agents needs a delta.

## Impact

- New `toolkit/commands/jois-code/validate.md` and a new agent file in `toolkit/agents/`.
- `toolkit/check_toolkit.py`, the installer data and the tests under `toolkit/tests/` that list commands and agents.
- Wiki pages under `wiki/toolkit/` (`Toolkit-Guide`, `Command-Details`, `Task-Agent`), updated in the same change, and `python scripts/check_docs.py` must pass.
- No change to `planner/`. The result file sits in the untracked slice folder that the plan skill already owns.
- Risk: validate runs code, and for a PR it may be code from someone else. The safety rules above are the answer, and the design must say what they cannot guarantee.
