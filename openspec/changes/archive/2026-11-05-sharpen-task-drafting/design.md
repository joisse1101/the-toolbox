# Design

## Context

The `slice-tasks` capability and the skill's tasks step shipped in `plan-generates-tasks`. A reliability test then drafted `tasks.md` six times (two runs of each of three mock slices). The writer accepted all six, so the format and the carry-over are not the problem. The weak spots are in the skill text: the judges found that Verify lines skip things they cite and that open items are never mentioned, and the drafters named six points the text left open. See proposal.md for the full list.

## Goals / Non-Goals

**Goals:**
- Make two drafts of one slice agree on form, and raise the quality of the Verify lines, by changing the instructions the model reads.
- Settle each unclear point to match what `diagrams/tasks.js` already accepts, so no code changes.

**Non-Goals:**
- A new writer check. The checks stay as they are.
- A way to judge Verify quality mechanically.
- Rewriting the task parser or the carry-over.

## Decisions

**Text changes, not a new check.** The weaknesses are about meaning (does a Verify line check what it cites), which a regex cannot judge. A step-coverage check (every step of a row appears in a task that names it) was considered. It is left out because the judges also found a case where the document's own table omitted a real step, and a check would have refused that good draft. It can be added later if more runs show it would not reject good work.

**Settle the six points to what the parser accepts.** The parser ignores a `# Tasks` line, tolerates blank lines, reads bare step ids split on commas or spaces, pools the steps of a task that names several criteria, and does not require a story Title. Documenting the existing behavior costs no code and no migration. Alternative: make the title line required. Rejected: all six drafts omitted it and passed, and existing `tasks.md` files would then fail.

**Pin the accepted forms with tests.** The forms are now contract, so `tasks-parse.test.mjs` gets a test per form, including that a flow-prefixed step is refused. Without that, a parser tidy-up could silently change what drafts are accepted.

**Report what was left out in the reply, not the file.** The list of uncovered rules and open items is for the user's review of the draft, so it goes in the review reply. Putting it in `tasks.md` would add lines that are neither tasks nor ticks, and the archive step counts checkboxes.

**Where the text goes.** The task-quality rules go in `SKILL.md` (what the skill does) and the accepted forms in section 10 of the conventions (what the writer accepts), in the source file `planner/guidelines/diagram-conventions.md`, which the sync script copies. A patch bump of the skill version marks the text change.

## Risks / Trade-offs

- [More instructions make the skill text longer and may not change what the model does] → Re-run the same kind of test after the change and compare; the plan is to check with fresh drafts before calling the fix done.
- [Two judges disagreed on which draft was better, so "good" is partly taste] → The rules ask for what both judges flagged (cited steps are checked, open items are named), not for a style.
- [The step rule can push the skill to tell the user "the table lacks step X" often] → That is the intended outcome: a table that omits a real step is a design gap the user should see.

## Migration Plan

Additive text. No file on disk changes, and an existing `tasks.md` stays valid. Rollback is reverting the text.

## Open Questions

- None that change the specs or the task breakdown. Whether a step-coverage check is worth adding is left for after a second round of runs.
