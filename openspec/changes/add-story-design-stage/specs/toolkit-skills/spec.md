# Spec Delta

## MODIFIED Requirements

### Requirement: Task agent applies one group of tasks
The toolkit SHALL include an agent `task-applier` that applies one group of tasks of a plan, which is an OpenSpec change or a slice, handed to it by the orchestrating session with the verbatim task texts and the files to read. The agent's own text SHALL NOT name a slice file, an acceptance-criteria id or a specific orchestrating command: the orchestrating session's brief SHALL say what each task satisfies and how to verify it, and the agent SHALL follow that brief. It SHALL work through the tasks in order and SHALL stop at the first task that is blocked or failed, so that no later task is built on it. For each task it SHALL name in its report what the brief says the task satisfies, and when a task conflicts with that it SHALL stop and report `blocked: <question>` and SHALL NOT narrow, defer or drop specified behavior to make the task fit. Its tool list SHALL be limited to `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` and `Artifact`, it SHALL declare a turn limit of 50, and it SHALL carry a frontmatter `PreToolUse` hook on `Bash` that blocks a command that runs `git commit`, `git push` or `gh`. It SHALL NOT edit `tasks.md`, SHALL NOT edit or regenerate the `/opsx:*` commands, and SHALL NOT commit, push or call GitHub. When a task needs a decision it cannot make from the task text and the files it was given, it SHALL stop and report `blocked: <question>` and SHALL NOT guess.

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
- **WHEN** a task needs a choice that the task text and the files it was given do not settle
- **THEN** the agent SHALL end its report with `blocked: <question>` and make no change that depends on the answer

#### Scenario: Tasks in order
- **WHEN** the group has tasks 2.1, 2.2 and 2.3 and task 2.2 fails
- **THEN** the agent SHALL NOT start task 2.3, and its report SHALL say tasks 2.1 done, 2.2 failed and 2.3 not started

#### Scenario: Task conflicts with the spec
- **WHEN** a task would require dropping or narrowing a requirement, scenario or criterion that the brief names
- **THEN** the agent SHALL make no change that depends on it and SHALL end its report with `blocked:` naming the requirement and the conflict

#### Scenario: Same agent for either plan
- **WHEN** `/jois-code:apply` hands it a slice's group, or a session following the apply guidance hands it a change's group
- **THEN** the agent SHALL work the same way and SHALL take what each task satisfies and how to verify it from the brief

## ADDED Requirements

### Requirement: Task agent builds against the task's artboards
When a task in the brief carries a `Design` line, the agent SHALL open each artboard link with the `Artifact` tool before it writes any code for that task, and SHALL build the screen's layout, copy and behaviour to match it. Its report SHALL name the artboards it opened per task. A file that a read saves SHALL go under `.scratch/`, and the agent SHALL NOT copy an artboard into the repo.

#### Scenario: Task with a design line
- **WHEN** a task's `Design` line names a desktop and a mobile artboard
- **THEN** the agent opens both before editing, builds to match them, and its report names both

#### Scenario: Artboard cannot be opened
- **WHEN** an artboard link fails to open
- **THEN** the agent writes no code for that task and ends its report with `blocked:` naming the link and the error

#### Scenario: Artboard and task disagree
- **WHEN** an artboard shows a behaviour that the task's criterion does not describe
- **THEN** the agent stops and reports `blocked:` naming the artboard and the difference, and does not choose one itself

### Requirement: Apply carries the design lines into the brief
`/jois-code:apply` SHALL copy each task's `Design` line into the brief unchanged with the rest of the task, and SHALL NOT drop, shorten or paraphrase it.

#### Scenario: Group with screen tasks
- **WHEN** apply dispatches a group whose tasks carry `Design` lines
- **THEN** each task in the brief holds its `Design` line exactly as `tasks.md` holds it
