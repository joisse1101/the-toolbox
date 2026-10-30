## ADDED Requirements

### Requirement: Apply orchestrator command
The toolkit SHALL include a command `jois-code:apply`, the single file `toolkit/commands/jois-code/apply.md`, that applies an OpenSpec change by handing its tasks to `opsx-task-applier` one group at a time. It SHALL take the change name as its argument and ask the user to choose when it is omitted and not clear from the conversation.

#### Scenario: Change named
- **WHEN** the user types `/jois-code:apply fix-opsx-apply-delegation`
- **THEN** the command SHALL announce the change and work on that change only

#### Scenario: Change omitted
- **WHEN** the user types `/jois-code:apply` and several changes are active
- **THEN** the command SHALL ask the user to choose one before doing anything else

### Requirement: Apply orchestrator reads the change through the CLI
The `jois-code:apply` command SHALL read the change with `openspec status` and `openspec instructions apply --json`, SHALL stop on a blocked or all-done state, and SHALL read every file under `contextFiles` and the `context` and `operationGuidance` the output carries before it dispatches anything.

#### Scenario: Context read first
- **WHEN** the apply instructions are ready
- **THEN** the command SHALL read every `contextFiles` file before the first dispatch

#### Scenario: Blocked or all done
- **WHEN** `openspec instructions apply --json` reports `blocked` or `all_done`
- **THEN** the command SHALL show the message, SHALL NOT dispatch, and for `all_done` SHALL suggest `/opsx:archive`

### Requirement: Apply orchestrator checks the agent is installed
The `jois-code:apply` command SHALL check that `opsx-task-applier` is installed in `~/.claude/agents/` or in the project's `.claude/agents/`. If it is not, the command SHALL say so, name `Install-Toolkit.ps1`, stop, and SHALL NOT copy the agent itself.

#### Scenario: Agent not installed
- **WHEN** `opsx-task-applier` is installed in neither folder
- **THEN** the command SHALL say so, name `Install-Toolkit.ps1`, stop, and SHALL NOT copy the agent itself

### Requirement: Apply orchestrator dispatches one group at a time
A group is one `##` section of `tasks.md`. The `jois-code:apply` command SHALL take groups in file order, skip a group with no pending task, hand a partly ticked group only its pending tasks, dispatch one group at a time, and wait for the report before the next dispatch.

#### Scenario: Groups in file order
- **WHEN** `tasks.md` has sections `## 1.`, `## 2.` and `## 3.` and section 1 has no pending task
- **THEN** the command SHALL skip section 1, dispatch section 2, and dispatch section 3 only after section 2's report and commit stop

#### Scenario: Resume a partly done group
- **WHEN** a section has tasks 3.1 ticked and 3.2 pending
- **THEN** the command SHALL hand the agent only task 3.2

### Requirement: Apply orchestrator announces and briefs each dispatch
Before each dispatch the `jois-code:apply` command SHALL say the group, its tasks, the files it expects the agent to touch, a rough time estimate labeled as an estimate, that there is no live timer, how to open the agent's transcript, and the agent's turn limit. It SHALL hand the agent the verbatim task texts, the paths of the `contextFiles` and the guidance entries that apply.

#### Scenario: Announcement before a dispatch
- **WHEN** the command is about to hand a group to the agent
- **THEN** it SHALL first say the group, its tasks, the files expected, the labeled estimate, that there is no live timer, where to open the transcript, and the agent's turn limit

#### Scenario: Agent briefed
- **WHEN** the command dispatches a group
- **THEN** the prompt SHALL carry the verbatim task texts and the `contextFiles` paths, and SHALL tell the agent not to edit `tasks.md`

### Requirement: Apply orchestrator records outcomes in tasks.md
After each report the `jois-code:apply` command SHALL say in one line whether the group is done, failed or blocked. For each task whose report carries a `result:` clause it SHALL copy that clause verbatim into the task's line in `tasks.md` and tick the box, and it SHALL be the only writer of `tasks.md`.

#### Scenario: Outcome after a report
- **WHEN** the agent's report arrives
- **THEN** the command SHALL say in one line whether the group is done, failed or blocked, and for each task with a `result:` clause SHALL copy it verbatim into the task's line in `tasks.md` and tick the box

#### Scenario: Agent reports blocked
- **WHEN** the report ends with `blocked: <question>`
- **THEN** the command SHALL tick only the tasks that have a `result:` clause, ask the user the question, and dispatch the rest of the group again with the answer

#### Scenario: A task failed
- **WHEN** the report says a task failed
- **THEN** the command SHALL tick only the tasks with a `result:` clause, stop, and report what failed

### Requirement: Apply orchestrator stops for a commit after each group
After each completed group the `jois-code:apply` command SHALL stop and follow the `jois-git-commit-hygiene` rule, without restating that rule's steps, before it dispatches the next group.

#### Scenario: Commit stop after a group
- **WHEN** a group's tasks are all reported done
- **THEN** the command SHALL stop and follow the `jois-git-commit-hygiene` rule, and the agent SHALL have committed nothing

### Requirement: Apply orchestrator never implements and stays advisory
The `jois-code:apply` command SHALL NOT implement a task itself, edit code, call `/opsx:apply`, or edit, copy or regenerate the `/opsx:*` commands. It SHALL be advisory: the toolkit adds no hook that blocks a session from running plain `/opsx:apply`.

#### Scenario: Plain apply unchanged
- **WHEN** a session runs `/opsx:apply` without `/jois-code:apply`
- **THEN** nothing SHALL block it from implementing tasks itself, and the toolkit SHALL NOT edit, copy or regenerate that command

#### Scenario: Orchestrator does not implement
- **WHEN** the command has a group to apply
- **THEN** it SHALL hand the group to `opsx-task-applier` and SHALL NOT make the tasks' code changes itself

### Requirement: Task agent description names its use
The `description` of `opsx-task-applier` SHALL state that the agent is dispatched by `/jois-code:apply`
for one group of tasks of an OpenSpec change and that the main session SHALL NOT implement those tasks
itself, so that the agent list alone tells a session when to use it. The description SHALL keep
stating that the agent never commits, pushes, calls GitHub or edits `tasks.md`.

#### Scenario: Agent listed in a session
- **WHEN** a session lists `opsx-task-applier` among its available agents
- **THEN** the description SHALL say it is dispatched by `/jois-code:apply` for one group of tasks instead of the main session implementing them

#### Scenario: Limits still stated
- **WHEN** the description is read
- **THEN** it SHALL still say the agent never commits, pushes, calls GitHub or edits `tasks.md`

## RENAMED Requirements

- FROM: `### Requirement: Task agent applies one OpenSpec task`
- TO: `### Requirement: Task agent applies one group of OpenSpec tasks`

## MODIFIED Requirements

### Requirement: Task agent applies one group of OpenSpec tasks
The toolkit SHALL include an agent `opsx-task-applier` that applies one group of tasks of an OpenSpec
change, handed to it by the orchestrating session with the verbatim task texts and the change's
artifacts to read. It SHALL work through the tasks in order and SHALL stop at the first task that is
blocked or failed, so that no later task is built on it. For each task it SHALL name in its report the
requirement or scenario of the change's specs that the task satisfies, and when a task conflicts with
the specs it SHALL stop and report `blocked: <question>` and SHALL NOT narrow, defer or drop specified
behavior to make the task fit. Its tool list SHALL be limited to `Read`, `Grep`, `Glob`, `Edit`,
`Write` and `Bash`, it SHALL declare a turn limit of 50, and it SHALL carry a frontmatter `PreToolUse`
hook on `Bash` that blocks a command that runs `git commit`, `git push` or `gh`. It SHALL NOT edit
`tasks.md`, SHALL NOT edit or regenerate the `/opsx:*` commands, and SHALL NOT commit, push or call
GitHub. When a task needs a decision it cannot make from the task text and the artifacts, it SHALL
stop and report `blocked: <question>` and SHALL NOT guess.

#### Scenario: Commit attempted
- **WHEN** the agent runs a Bash command containing `git commit`
- **THEN** the hook SHALL block it with an error naming the rule, and nothing SHALL be committed

#### Scenario: Push or GitHub call attempted
- **WHEN** the agent runs a Bash command containing `git push` or `gh`
- **THEN** the hook SHALL block it

#### Scenario: Turn limit reached
- **WHEN** the agent reaches its turn limit before the group is done
- **THEN** its report SHALL say which tasks are done and which are not, so the orchestrator can dispatch the rest or ask the user

#### Scenario: Decision needed
- **WHEN** a task needs a choice that the task text and the change artifacts do not settle
- **THEN** the agent SHALL end its report with `blocked: <question>` and make no change that depends on the answer

#### Scenario: Tasks in order
- **WHEN** the group has tasks 2.1, 2.2 and 2.3 and task 2.2 fails
- **THEN** the agent SHALL NOT start task 2.3, and its report SHALL say tasks 2.1 done, 2.2 failed and 2.3 not started

#### Scenario: Task conflicts with the spec
- **WHEN** a task would require dropping or narrowing a requirement or scenario of the change's specs
- **THEN** the agent SHALL make no change that depends on it and SHALL end its report with `blocked:` naming the requirement and the conflict

### Requirement: Task agent reports only what it saw
The agent's report SHALL, for each task of the group, list the files it changed; the commands it ran,
each with the result its output showed and any counts that output gave; the manual checks it made; the
items it could not verify; the requirement or scenario the task satisfies; and a single `result:`
clause for the task. The clause SHALL contain only commands and outcomes the agent ran and saw, and
SHALL be written so that the orchestrator can copy it into `tasks.md` without rewording. The report
SHALL NOT state a result the agent did not observe, and SHALL NOT quote a count its output did not
give.

#### Scenario: A command was run
- **WHEN** the agent runs a test command and its output shows 12 passed and 0 failed
- **THEN** the report SHALL list the command with that result, and the task's `result:` clause SHALL carry the same figures

#### Scenario: A check was not possible
- **WHEN** the agent could not run a check a task asked for
- **THEN** the report SHALL list it under unverified and the task's `result:` clause SHALL NOT claim it passed

#### Scenario: One result clause per task
- **WHEN** the group has three tasks and all are done
- **THEN** the report SHALL carry three `result:` clauses, each labeled with its task number

#### Scenario: Report shape for write-pr
- **WHEN** the orchestrator copies a `result:` clause into the task's line in `tasks.md`
- **THEN** `write-pr` SHALL read it as a task that records its outcome, with no change to `write-pr`

### Requirement: Jois command files are versioned
Each command file under `toolkit/commands/jois-git/`, `toolkit/commands/jois-init/` and
`toolkit/commands/jois-code/` SHALL declare `metadata.version` (semver) and `metadata.last_updated`
(a date) in its frontmatter, and the docs check SHALL fail and name a file where either is missing or
malformed.

#### Scenario: Missing version
- **WHEN** `toolkit/commands/jois-git/stage.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Setup command is checked too
- **WHEN** `toolkit/commands/jois-init/opsx.md` has no `metadata.last_updated`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Orchestrator command is checked too
- **WHEN** `toolkit/commands/jois-code/apply.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

## REMOVED Requirements

### Requirement: Apply guidance delegates tasks to the agent
**Reason**: The delegation procedure moves into the `/jois-code:apply` command, where it is delivered
when the user types it. A line in the `operations.apply` guidance reached the session only through a
command output it could cut off (issue #43).
**Migration**: Re-run `/jois-init:opsx` to replace the managed `operations.apply` block, which then
holds only the commit-stop line, and run `/jois-code:apply <change>` to apply a change through the
agent.
