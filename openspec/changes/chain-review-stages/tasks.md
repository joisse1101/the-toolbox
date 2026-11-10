## 1. Review findings mode

- [x] 1.1 In `toolkit/skills/jois-story-review/SKILL.md`, add a "Called by another skill" section: scope input (Titles and IDs), read-only, no `write-review.mjs`, findings returned as review rows with `confidence`; leave the direct-run behaviour as it is. Raise `metadata.version` and `last_updated`.
  Verify: read the file; the direct-run steps are unchanged and the new section says no writer runs when called.
- [x] 1.2 In `toolkit/skills/jois-story-verify/SKILL.md`, add a "Called by the plan skill" section: all nine checks, findings returned ranked, no slice write and no review row in that call. Raise version and date.
  Verify: read the file; the user-run "Route each finding" steps are unchanged.

## 2. Propose ends with a review round

- [x] 2.1 In `toolkit/skills/jois-story-propose/SKILL.md`, add `Skill` to `allowed-tools` and a "Review the written stories" section: after the last read-back, call review in findings mode on the stories written, patch `ready` findings through `write-proposal.mjs` without a new yes/no, turn `confirm` findings into Clarifications questions, stop after 2 rounds, skip backlog and frozen stories, report each fix with old and new value. Add the exception to the "Confirm before writing" rule in one sentence. Raise version and date.
  Verify: read the file; the section names the 2-round cap, the `ready` rule and the report content, and "Confirm before writing" names the exception.

## 3. Plan ends with verify

- [x] 3.1 In `toolkit/skills/jois-story-plan/SKILL.md`, add `Skill` to `allowed-tools`, update the question text before the yes/no (freeze happens once verify finds nothing critical), and add a "Verify before the freeze" section: run verify after the read-back, correct slice problems through `write-diagram.mjs` without a second yes/no (2 rounds), list story findings, `TBC` decisions and open questions without fixing them, freeze only when no critical finding is open, and handle verify not installed. Move the "Freeze after the slice is written" section after it. Raise version and date.
  Verify: read the file; the order is write, read back, verify, freeze, and the freeze section names the "no critical finding" condition.

## 4. Review callable, apply reviews before the tests

- [x] 4.1 In `toolkit/commands/jois-code/review.md`, remove `disable-model-invocation: true`, add a rule that a call for an OpenSpec change runs the static check only and asks no question, and raise version and date.
  Verify: read the file; the front matter has no `disable-model-invocation` and the rule is in the Rules section.
- [x] 4.2 In `toolkit/commands/jois-code/apply.md`, add `Skill` to `allowed-tools`, split the last group so its non-test tasks are committed first, then add a "Review before the tests" step: call `jois-code:review` (`slice <backlog>/<slice>` in the slice form, nothing otherwise), treat static findings and `not met` verdicts as failures for the step 9 fix loop with a `fix` commit per round and a re-review, list suggestions without fixing, never pass `--fix` or `--comment`, and start the test task only when no review failure is left. Handle review not installed. Raise version and date.
  Verify: read the file; the step order is non-test tasks, commit, review, fix loop, test task, and the step names the two forms.

## 5. Docs and checks

- [x] 5.1 Update `wiki/planner/Story-Skills.md`, `wiki/planner/architecture/Story-Skills-Internals.md` and `wiki/planner/User-Flows.md` for the propose review round, the plan verify stage and the new freeze order, and `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Task-Recipes.md` and `wiki/toolkit/Toolkit-Guide.md` for the review stage in apply.
  Verify: `python scripts/check_docs.py` exits 0 and each page states the new order.
- [x] 5.2 Run the project's own test commands for the whole change, then complete any fixes the failures need: `cd toolkit; python check_toolkit.py; python -m pytest` and `node --test <abs>/toolkit/tests/story/*.test.mjs`, and `python scripts/check_docs.py`.
  Verify: all three commands exit 0; an install check shows the changed skills and commands copy with the new front matter.
