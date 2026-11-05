# Design

## Context

A slice is the folder `<backlog>/slices/<slice>/` with `UC-<slice>.md` and `source.json`. `write-diagram.mjs` already takes a `files` list, checks the draft (`diagrams/checks.js`, Mermaid's parser), writes each file atomically, writes `source.json` last and reads the folder back. `read-diagrams.mjs` compares `source.json`'s story hashes with the backlog to report a slice stale. The document's acceptance-criteria table already gives every criterion a stable `AC id` (`AC-<slice>-<name>`) and the step ids that realise it. See proposal.md for why tasks are added.

The rules for slices live in `planner/guidelines/diagram-conventions.md`. `planner/scripts/sync-skill-logic.mjs` copies that file into the skill's `references/`, and the copy is generated.

## Goals / Non-Goals

**Goals:**
- Tasks and slice are written, reviewed and kept in step as one unit.
- The tick is the checkbox in the file, so a person can tick by hand and a later step can count.
- The task logic is pure, so `npm test`-style tests cover it without I/O.

**Non-Goals:**
- The apply and archive steps that tick and count tasks.
- Tasks for a slice the skill did not draw, or tasks in any place other than the slice folder.
- Putting tasks into `UC-<slice>.md`: tasks change as work progresses, while the specification stays a design record.

## Decisions

**Tasks are written by the slice writer, not by a new script.** `tasks.md` is one more entry of the `files` list. This reuses the check, the atomic write and the read-back, and gives the one-yes/no flow without a new script, so the skill's `allowed-tools` list is unchanged. Alternative: a separate `write-tasks.mjs`. Rejected: two writes could leave a slice and tasks out of step, which is what this change prevents.

**The stable key is the task id, and the criterion is named by its `AC id`.** The task id (`T-<slice>-<name>`) is what the carry-over matches on, and the `AC id` is what traces a task to the specification. Task numbers and headings are not keys, because they shift when a flow is added. Alternative: key on the criterion's label `AC1`. Rejected: labels are positional (`criteriaOf` numbers criteria by position when the story has no labels), so inserting a criterion would silently move every tick onto the wrong task.

**A tick is kept only while the criterion text is unchanged.** The writer compares each named criterion's text in the old document's table with the new table (the table holds the text verbatim). Different text means the work may no longer satisfy it, so the task is written unticked and reported. This errs towards "not done", because the archive step trusts ticks to mean done. Alternative: keep every tick and report. Rejected: a false "done" is worse than redoing a check.

**The skill sends every task unticked and the writer sets the ticks.** The writer reads the existing `tasks.md` at write time, so a tick made by hand between the skill's read and the write is not lost, and the skill never has to copy ticks. The write stays idempotent because the same input yields the same ticks.

**No staleness fingerprint for tasks.** Tasks are redrawn with the slice, so they are stale exactly when `source.json` says the slice is stale. A second fingerprint would only matter if tasks could be written alone, and they cannot.

**Layout of `tasks.md`.** One `## <flow>` group per sequence flow (the flow slug of its `### Sequence:` heading), each task a checkbox line with `Satisfies:` and `Verify:` lines below it, the shape OpenSpec's `tasks.md` and the archived ones use, so a later step can count `- [ ]` and `- [x]` lines. A flow with no failure path still gets a group; a criterion that belongs to no flow cannot exist, since each row of the table names a flow.

**Where the code goes.** A new pure module `diagrams/tasks.js` parses `tasks.md`, applies the checks against the parsed document (`diagrams/document.js`, `readDocument`) and computes the carry-over. `write-diagram.mjs` calls it in `prepare` and adds `tasks.md` to the files it writes and reads back. `read-diagrams.mjs` calls its counter for the progress line. The conventions get one new section, `## 10. Tasks (tasks.md)`, in the source file under `planner/guidelines/`, then the sync script copies it.

## Risks / Trade-offs

- [A reworded criterion resets a tick the user earned] → The reply lists each reset by task id and title, so nothing is lost silently, and the user can retick.
- [`Verify` text is only checked for being non-empty] → The review step shows the complete `tasks.md`, so the user judges whether each verification is real. A weak check beats a false one.
- [A longer review: slice and tasks together] → Accepted. Tasks come straight from the design the user just confirmed.
- [The skill file is large and the test for it asserts on its text] → Add tasks text and its test in one concern, and bump the skill's version.
- [CRLF working copies: the sync test compares raw bytes] → Known and unrelated; the archived `plan-greenfield-mode` tasks record it. Run the sync script, then compare ignoring carriage returns.

## Migration Plan

Additive. A slice without `tasks.md` reads as before, and the next redraw writes one. Nothing is rewritten on read. Rollback is removing the new module and the skill text; existing `tasks.md` files are then ignored (the writer would leave them as "files it did not write").

## Open Questions

- "The write is logged like the other writers" (issue #72) is read as the writer's printed result line plus the read-back, since no writer keeps a log file. Say so in review if a log file is meant.
