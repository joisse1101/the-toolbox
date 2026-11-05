# Design

## Context

`sharpen-task-drafting` made the plan skill list, in its review reply, the rules, `TBC` decisions and open questions that no task covers. A hand-run on the sign-in slice applied that rule and found it under-defined in three places. See proposal.md for what changes and why.

The document already holds what these definitions need: `## Failure responses` rows carry an `AC id` and a `Step`, `## Design decisions` rows carry a `Steps` cell, and `## Non-functional and security rules` rows carry a `Steps` cell. Open questions carry only an item and a blocking flag.

## Goals / Non-Goals

**Goals:**
- Make "covered" and "depends on" mean one thing, so two runs list the same gaps.
- Show a failure path that is drawn but has no failure criterion.

**Non-Goals:**
- A writer check for any of this. The reply is for the user's review, and a check would refuse good drafts for a judgment call.
- Changing how the document's tables are written.

## Decisions

**Covered means named in a Verify line.** A rule counts as covered when some task's `Verify:` line names it. The alternative, covered when a task cites a step in the rule's `Steps` cell, is rejected: a task can cite a step without checking the rule, which is the false "covered" the list exists to prevent.

**A failure response is a gap when its criterion is on the main path.** The document ties each failure response to an `AC id`, and when that row is `main` there is no failure criterion. Listing those rows shows the bad-path behavior that the table never made a task for. A failure tied to a `failure` row is already owed its own task by the granularity rule.

**A task depends on a TBC decision through the decision's `Steps` cell.** That column is the document's own link between decisions and steps, so no new data is needed. An open question that names a decision id inherits the dependency. Other open questions have no step, so they cannot be tied to a task, and they are listed in the review reply instead of being forced into Verify lines.

**Write the definitions once.** They go in section 10 of the conventions under a "Review reply" subsection, in the source file `planner/guidelines/diagram-conventions.md` that the sync script copies. `SKILL.md` points to it instead of restating it, which is how the skill already treats the layout rules.

## Risks / Trade-offs

- [Counting only a named rule as covered makes the list longer] → A longer list is a visible gap to decide on; a shorter one hides unbuilt behavior.
- [Matching "names it" is a judgment the model makes] → The wording asks for the failure or rule itself to appear in the Verify line, which a reader can check in the shown draft.
- [This change and `sharpen-task-drafting` both touch the same skill paragraph] → Only requirements are added here, and the skill text changes are small and additive.

## Migration Plan

Additive text. No file on disk changes. Rollback is reverting the text.

## Open Questions

- None.
