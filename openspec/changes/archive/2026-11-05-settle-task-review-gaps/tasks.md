# Tasks

## 1. Conventions (one concern: the review-reply definitions)

- [x] 1.1 In `planner/guidelines/diagram-conventions.md` section 10, add a "Review reply" subsection defining: a rule or failure response is covered when some task's `Verify:` line names it (citing a step of its `Steps` cell is not enough); a failure response is a gap when its `AC id` row is on the main path and no task's Verify line names it; a task depends on a `TBC` decision when the decision's `Steps` cell lists a step the task cites, an open question naming a decision id inherits that, and any other open question is only listed in the reply; then run `node planner/scripts/sync-skill-logic.mjs` and verify `toolkit/skills/jois-story-plan/references/diagram-conventions.md` shows the new subsection (the skill copy is generated, never edited by hand) (result: `node planner/scripts/sync-skill-logic.mjs` -> exit 0; grep shows "### Review reply" at line 295 of toolkit/skills/jois-story-plan/references/diagram-conventions.md; `git status --short` -> only the two diagram-conventions.md files modified)
- [x] 1.2 Run `python scripts/check_docs.py` and `npm --prefix <abs>/planner test`, and verify both pass, including the skill-sync test (result: `python scripts/check_docs.py` -> "docs check passed"; `npm --prefix <abs>/planner test` -> 557 tests, 557 pass, 0 fail, including the skill-sync test (exit codes not captured by the agent; the printed output shows success))

## 2. Skill text and docs (one concern: how the skill reports gaps)

- [x] 2.1 In `toolkit/skills/jois-story-plan/SKILL.md`, extend the "Open items" bullet of "Draft the slice" with the decision-`Steps` rule and extend the review-reply list of "Check, show, confirm" with the failure responses that no task names and the covered-means-named rule, pointing at the "Review reply" subsection of section 10 instead of restating it; bump `metadata.version` to `1.2.2` (result: SKILL.md edited by hand, version 1.2.2; checked by 2.2 -> 13 pass, 0 fail, and 2.4 -> toolkit check passed)
- [x] 2.2 In `toolkit/tests/story/plan-skill.test.mjs`, add assertions that the text names the failure-response gap, the covered-means-named rule and the decision-`Steps` rule, and update the version assertion; verify with `node --test <abs>/toolkit/tests/story/plan-skill.test.mjs` exiting 0 (result: `node --test <abs>/toolkit/tests/story/plan-skill.test.mjs` -> exit 0, 13 tests, 13 pass, 0 fail)
- [x] 2.3 Add a sentence to `wiki/planner/Story-Skills.md` saying the review reply also lists failure paths no task covers, and run `python scripts/check_docs.py` and verify it passes (result: `python scripts/check_docs.py` -> docs check passed)
- [x] 2.4 Run `toolkit/.venv/Scripts/python.exe toolkit/check_toolkit.py` and verify it reports the toolkit check passed (result: `toolkit/.venv/Scripts/python.exe toolkit/check_toolkit.py` -> toolkit check passed)

## 3. Verify the whole change

- [x] 3.1 Run `node --test <abs>/toolkit/tests/story/*.test.mjs` and `npm --prefix <abs>/planner test`, and verify every test passes (result: node --test toolkit/tests/story/*.test.mjs -> 424 pass, 0 fail; npm --prefix planner test -> 557 pass, 0 fail)
- [x] 3.2 Run `openspec validate settle-task-review-gaps` and verify it reports the change valid (result: openspec validate settle-task-review-gaps -> valid)
- [x] 3.3 Manual check on the committed sign-in fixture, read in place without writing anything: apply the new rules by hand to its document and its `tasks.md` and verify the review reply would list the failure responses tied to main-path criteria, name decision D7 against the task that cites its step, and count "never logged" as covered only if a Verify line names it (result: by-hand on toolkit/tests/story/fixtures/sample/slices/sign-in -> 7 failure responses listed as gaps (all tied to main-path criteria); D7 named against T-sign-in-login-dashboard (cites step 2.5, Verify line lacks D7); "never logged" listed as not covered because no Verify line names it; hash-function open question listed only)

## Workflow follow-up

- Archive this change after `sharpen-task-drafting`, with `/opsx:archive`.
