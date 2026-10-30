## Why

`/opsx:apply` implemented the tasks of a change in the main session instead of handing each one to
`opsx-task-applier` (issue #43), although `openspec/config.yaml` asks for it. The delegation
procedure reached the session only as `operationGuidance` in the JSON of
`openspec instructions apply --json`, a tool result the session can cut off (it piped the output
through `head -c 1500`). The generated `/opsx:apply` text, which cannot be edited, says to "make the
code changes required" and never mentions the agent. An always-loaded rule would also depend on text
the session has to keep and prefer over the command in front of it. A command the user types
delivers its procedure as its own text, at the moment it is needed.

## What Changes

- Add a command, `toolkit/commands/jois-code/apply.md` (`/jois-code:apply <change>`), that
  orchestrates an apply: it reads the change through the `openspec` CLI, takes the tasks one `##`
  group at a time, announces each group, hands it to `opsx-task-applier`, says the outcome in one
  line, copies each task's `result:` clause verbatim into `tasks.md` with the box ticked, and stops
  for a commit after each group. It never implements a task itself and does not call `/opsx:apply`.
- Change `opsx-task-applier` to apply one group of tasks instead of one task: it works through the
  tasks in order, stops at the first blocked or failed task, gives one `result:` clause per task,
  quotes the spec requirement or scenario each task satisfies, and reports `blocked:` when a task
  conflicts with the spec. Its turn limit rises to 50 and its description names `/jois-code:apply`.
- Remove the delegation line from the `/jois-init:opsx` guidance block, together with its agent check
  and its report field. The commit-stop line stays. The agent check moves into the new command.
- Retire the delegation rule `toolkit/rules/jois-opsx-apply-delegation.md` and its `check_toolkit.py`
  entry and tests, added earlier in this change and no longer wanted.
- Plain `/opsx:apply` is unchanged and still advisory. No hook or other enforcement is added, and the
  generated `/opsx:*` commands are not edited, copied or regenerated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: a requirement for the apply orchestrator command is added; the task agent applies
  a group of tasks, reports per task and checks its work against the spec; the agent description
  names its use; the "Apply guidance delegates tasks to the agent" requirement is removed; the
  command-version requirement covers `jois-code`.

## Impact

- New: `toolkit/commands/jois-code/apply.md`.
- Removed: `toolkit/rules/jois-opsx-apply-delegation.md` (and its `check_toolkit.py` entry and tests).
- Changed: `toolkit/agents/opsx-task-applier.md` (group, report, alignment, turn limit, description,
  version bump), `toolkit/commands/jois-init/opsx.md` (guidance block, agent check and report field
  removed, version bump), `toolkit/check_toolkit.py` and `toolkit/tests/` (`jois-code` versioned),
  `toolkit/README.md`, and this repository's `openspec/config.yaml` (the managed block).
- No change to `write-pr`, `update-pr`, the commit-hygiene rule, the installer's kinds or the planner.
- Checks: the toolkit's own tests (`cd toolkit; python check_toolkit.py; python -m pytest`).
