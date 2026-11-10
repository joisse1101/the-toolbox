## Context

Step 10 of `toolkit/commands/jois-code/apply.md` dispatches `opsx-test-runner` after each group, judges its exit codes and commits only on green. Step 9's fix loop and "deferrable failure" rule, and step 11's held-back commits, were added so a red mid-change run would not stop the command. The runs are wasted effort while the change is in flight.

## Goals / Non-Goals

**Goals:** run the tests once, as a task in the last group; keep one commit per concern; keep the branch, foreign-change and split checks.

**Non-Goals:** renaming the agents, changing `opsx-test-runner`'s behaviour or hook, changing `jois-code:validate`, or pushing.

## Decisions

**Commit each group when its tasks are done (option A).** The commit condition "a test run passed" becomes "the group's tasks are done". Holding all commits until the end (option B) keeps history green but leaves a large uncommitted tree, and it would keep part of the held-back machinery. A broken commit is repaired by a fix commit from the final task.

**The apply command runs the final test task itself.** `opsx-task-applier` has no Agent tool, so it cannot start `opsx-test-runner`. The command sends the group's other tasks to the applier, then dispatches `opsx-test-runner` for the test task and judges its exit codes. A red result runs the existing fix loop (step 9), whose rounds are applier dispatches, and the runner is dispatched again after each round. The loop keeps its limits (ask after a second unexplained round or a repeated failure); only the deferrable-failure branch is removed. `opsx-test-runner` stays unchanged except that its description says the final test task dispatches it.

**Where the task comes from.**

- OpenSpec changes: a `rules.tasks` entry in `openspec/config.yaml`, outside the `jois-init` managed blocks so `/jois-init:opsx` does not overwrite it. Archived changes are untouched.
- Slices: `jois-story-plan` section 10 and its SKILL.md. The tasks check requires every task to cite AC ids and steps of its own flow's diagram, so the test task joins the last flow group and cites that flow's ACs. Its `Verify:` line names the whole-slice test commands.

**Stop conditions keep their meaning.** A missing `opsx-test-runner` no longer stops commits of earlier groups; apply names `Install-Toolkit.ps1` before it dispatches the last group.

## Risks / Trade-offs

- A bug is found later, at the last group, so the fix may touch files an earlier commit holds. This is accepted; the fix is a new commit.
- A slice's test task cites only the last flow's ACs, so the check cannot show it covers every flow. The `Verify:` line carries that.
- Older `tasks.md` files without a test task get no testing. Apply does not add one; the user can add a task.

## Open Questions

None that change what gets built.
