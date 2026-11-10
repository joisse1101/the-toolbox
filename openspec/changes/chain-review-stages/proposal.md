## Why

Each stage of the toolkit's pipeline ends with the user having to remember to run the next check by hand: `jois-story-propose` writes stories nobody has reviewed, `jois-story-plan` writes and freezes a slice nobody has verified, and `jois-code:apply` builds code and runs the tests before anyone has reviewed the diff. Mistakes reach the user, or get locked in by the freeze, when a check run one step earlier would have caught them.

## What Changes

- `jois-story-review` gains a **findings mode**: when another skill calls it, it takes a scope (the stories just written), reads only, writes no `review.csv` and returns its findings as a list. Run by the user, it behaves as before.
- `jois-story-propose` ends by calling review in findings mode on the stories it just wrote. It patches the certain findings (review's `ready` ones) without a new yes/no and lists each fix in its report. A finding that needs a decision becomes a Clarifications question. It stops after 2 rounds.
- `jois-story-plan` ends by calling `jois-story-verify` on the slice it just wrote and read back. The freeze moves after verify and happens only when verify finds nothing critical. The one yes/no still covers the write, any slice fix and the freeze.
- `jois-code:review` loses `disable-model-invocation`, so `jois-code:apply` can call it.
- `jois-code:apply` runs review as its last stage before the tests: the last group's non-test tasks are committed first, then review runs (the static check always, plus `validate` for the slice form only), its findings go through the existing fix loop, and only then does the test task run.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-review-skill`: adds the findings mode for a calling skill.
- `story-writing-skills`: propose ends with a review round and auto-patches certain findings.
- `plan-stories-skill`: plan ends with verify, and freezing moves after it (restates "Draft, confirm, write").
- `verify-story-skill`: verify can be called by plan and then returns findings only.
- `frozen-stories`: the freeze waits for a clean verify (restates "Only the plan skill freezes stories").
- `code-review-command`: the command can be called by apply.
- `toolkit-skills`: `jois-code:apply` reviews before the test task.

## Impact

- Files: `toolkit/skills/jois-story-review/SKILL.md`, `toolkit/skills/jois-story-propose/SKILL.md`, `toolkit/skills/jois-story-plan/SKILL.md`, `toolkit/skills/jois-story-verify/SKILL.md` (only if it needs a caller note), `toolkit/commands/jois-code/review.md`, `toolkit/commands/jois-code/apply.md`, and the matching `wiki/toolkit/` and `wiki/planner/` pages.
- The `allowed-tools` of propose, plan and apply each gain `Skill`; review's reference copies under `planner/` are regenerated if the sync script covers them.
- Version numbers and `last_updated` rise on every changed skill and command; `check_toolkit.py` and `scripts/check_docs.py` must pass.
- No change to any script, CSV format or the portal.
- Assumption: the story commands `/jois-story:propose`, `/jois-story:review` and `/jois-story:verify` need no change, because they load the skills.
