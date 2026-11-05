# Proposal

## Why

The story-to-code pipeline has no stage between planning a slice and building it. `jois-story-plan` checks a slice when it writes it, but nothing checks the stored slice again later. A slice can go stale, hold `TBC` design decisions, or sit on stories with open clarification questions, and the team finds out only while building. OpenSpec has a verify stage for this. The story side needs the same one, as stage 5 of the pipeline in issue #98.

## What Changes

- A new skill `jois-story-verify` and a command `/jois-story:verify` check one stored slice and report findings ranked critical, warning or suggestion, each with a fix.
- The checks are: the slice is stale against the backlog, its diagrams and document pass the plan skill's checks, every acceptance criterion has a task, no design decision is still `TBC`, no story in scope has an open clarification question, and no task depends on a decision or question that is still open.
- Verify reads first and writes only after the user approves the exact change.
- Slice fixes are written by running the plan skill's `write-diagram.mjs`, so every existing check still runs and nothing is written when one fails.
- Story problems are never edits. They become suggestions in `<backlog>/user-stories/review.csv`, written by `write-review.mjs`.
- Verify holds no copy of the plan skill's scripts. It loads the installed `jois-story-plan` and `jois-story-review` skills to find their folders, as `/jois-story:review` does, and stops when `jois-story-plan` is missing.
- Not in this change: ticking tasks, saving a report file, comparing the slice with the code, and a "ready to build" verdict for apply to read.

## Capabilities

### New Capabilities
- `verify-story-skill`: what the verify skill and command check, how findings are ranked and reported, which writes they may offer and how each is approved and routed.

### Modified Capabilities
- `toolkit-story-skills`: the toolkit holds five story skills, not four, and the commands include `verify` under `/jois-story:`.

## Impact

- New `toolkit/skills/jois-story-verify/SKILL.md` and `toolkit/commands/jois-story/verify.md`. No code or `package.json` of its own, since it runs the plan and review skills' scripts.
- `toolkit/tests/story/` gains tests for the skill's text and its `allowed-tools`. `allowed-tools.test.mjs` lists the story skills and needs the new one.
- `wiki/toolkit/` pages that list the story skills and commands, and `python scripts/check_docs.py`.
- No breaking change. The plan and review skills are unchanged. If a plan-skill script cannot report one of the checks as data, a small read-only addition to it may be needed, and design.md will say which.
