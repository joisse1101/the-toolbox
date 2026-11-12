## RENAMED Requirements

- FROM: `### Requirement: Task agent applies one group of OpenSpec tasks`
- TO: `### Requirement: Task agent applies one group of tasks`

## REMOVED Requirements

### Requirement: Apply orchestrator reads the change through the CLI
**Reason**: `jois-code:apply` no longer takes an OpenSpec change or calls the `openspec` CLI; it reads a slice's files.
**Migration**: replaced by "Apply orchestrator reads the slice and checks it is current". An OpenSpec change is applied with `/opsx:apply`.

### Requirement: Apply reviews before the test task
**Reason**: renamed and rewritten for the slice-only command; its OpenSpec-form scenario no longer applies.
**Migration**: replaced by "Apply reviews the slice before the test task".

### Requirement: Apply orchestrator command
**Reason**: the command takes a slice, not an OpenSpec change name, so its scenarios about a change name no longer hold.
**Migration**: replaced by "Apply orchestrator command takes a slice".

## MODIFIED Requirements

### Requirement: Agents source of truth
The repository SHALL keep every custom Claude Code agent under `toolkit/agents/`. Each entry directly
under it SHALL be a single `.md` file with `name`, `description` and `tools` frontmatter, and is the
unit the installer acts on.

#### Scenario: Agent file is one unit
- **WHEN** `toolkit/agents/task-applier.md` exists
- **THEN** the installer SHALL treat `task-applier.md` as one agent item and copy that file

#### Scenario: Agent without a tool list
- **WHEN** an agent file under `toolkit/agents/` has no `tools` frontmatter
- **THEN** the docs check SHALL fail and name the file, because an omitted list inherits every tool

### Requirement: Task agent applies one group of tasks
The toolkit SHALL include an agent `task-applier` that applies one group of tasks of a plan, which is an OpenSpec change or a slice, handed to it by the orchestrating session with the verbatim task texts and the files to read. The agent's own text SHALL NOT name a slice file, an acceptance-criteria id or a specific orchestrating command: the orchestrating session's brief SHALL say what each task satisfies and how to verify it, and the agent SHALL follow that brief. It SHALL work through the tasks in order and SHALL stop at the first task that is blocked or failed, so that no later task is built on it. For each task it SHALL name in its report what the brief says the task satisfies, and when a task conflicts with that it SHALL stop and report `blocked: <question>` and SHALL NOT narrow, defer or drop specified behavior to make the task fit. Its tool list SHALL be limited to `Read`, `Grep`, `Glob`, `Edit`, `Write` and `Bash`, it SHALL declare a turn limit of 50, and it SHALL carry a frontmatter `PreToolUse` hook on `Bash` that blocks a command that runs `git commit`, `git push` or `gh`. It SHALL NOT edit `tasks.md`, SHALL NOT edit or regenerate the `/opsx:*` commands, and SHALL NOT commit, push or call GitHub. When a task needs a decision it cannot make from the task text and the files it was given, it SHALL stop and report `blocked: <question>` and SHALL NOT guess.

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

### Requirement: Apply orchestrator announces and briefs each dispatch
Before each dispatch the `jois-code:apply` command SHALL say the group, its tasks, the files it expects the agent to touch, a rough time estimate labeled as an estimate, that there is no live timer, how to open the agent's transcript, and the agent's turn limit. It SHALL hand the agent the verbatim text of each pending task with its `Satisfies:` and `Verify:` lines, the path of `UC-<slice>.md` to read first, and the instruction not to edit `tasks.md`.

#### Scenario: Announcement before a dispatch
- **WHEN** the command is about to hand a group to the agent
- **THEN** it SHALL first say the group, its tasks, the files expected, the labeled estimate, that there is no live timer, where to open the transcript, and the agent's turn limit

#### Scenario: Agent briefed
- **WHEN** the command dispatches a group
- **THEN** the prompt SHALL carry the verbatim task texts with their `Satisfies:` and `Verify:` lines and the path of `UC-<slice>.md`, and SHALL tell the agent not to edit `tasks.md`

### Requirement: Apply orchestrator checks the agent is installed
The `jois-code:apply` command SHALL check that `task-applier` is installed in `~/.claude/agents/` or in the project's `.claude/agents/`. If it is not, the command SHALL say so, name `Install-Toolkit.ps1`, stop, and SHALL NOT copy the agent itself.

#### Scenario: Agent not installed
- **WHEN** `task-applier` is installed in neither folder
- **THEN** the command SHALL say so, name `Install-Toolkit.ps1`, stop, and SHALL NOT copy the agent itself

#### Scenario: Old agent name only
- **WHEN** only `opsx-task-applier.md` is installed
- **THEN** the command SHALL treat `task-applier` as not installed and say so

### Requirement: Apply orchestrator commits a checked group on an unprotected branch
On a named branch other than `main` or `master`, the `jois-code:apply` command SHALL commit a finished group without a confirmation word only when all of these hold: the group's tasks are all done, the group is one concern, and nothing other than the group's own files is staged or edited. It SHALL NOT run any test between groups. Otherwise it SHALL follow the stop-for-confirmation path and SHALL say which condition failed.

#### Scenario: Passing group on a feature branch
- **WHEN** a group's tasks are all done on branch `feat/x` and only the group's files changed
- **THEN** the command SHALL stage those files by explicit path, commit them once, print the short hash and message, and take the next group without dispatching `test-runner`

#### Scenario: Failing test run
- **WHEN** a test command in the final test task exits non-zero
- **THEN** that task SHALL run the fix loop, and the commits of earlier groups SHALL NOT have waited for any test

#### Scenario: A tracked file changes during the test run
- **WHEN** a tracked file outside the group's reported files differs from what the group reported
- **THEN** the command SHALL stop for the confirmation word and SHALL NOT stage that file

#### Scenario: Group is more than one concern
- **WHEN** the group's diff is over about 200 lines or 5 files, or spans more than one layer
- **THEN** the command SHALL cut it into one commit per concern, and SHALL stop for the confirmation word when one changed file holds two concerns

#### Scenario: Foreign changes present
- **WHEN** a file outside the group's reported files is staged or edited
- **THEN** the command SHALL NOT stage it and SHALL stop for the confirmation word

### Requirement: Test runner agent reports test results
The toolkit SHALL include an agent `test-runner`, the single file `toolkit/agents/test-runner.md`, on the `haiku` model with the tools `Read, Grep, Glob, Bash` and no `Edit` or `Write`. Its own text SHALL NOT name a specific orchestrating command. It SHALL run only test commands that the project's own instructions name, choosing the suites that cover the files it is given, and SHALL install nothing. It SHALL report, per command, the exact command line, the exit code and the counts line as printed, and SHALL list the suites it did not run.

#### Scenario: Reported results
- **WHEN** the agent finishes a run
- **THEN** its report SHALL give each command line with its exit code and counts line, and the suites not run

#### Scenario: Dependencies missing
- **WHEN** a suite cannot run because dependencies are missing
- **THEN** the agent SHALL report it as could-not-run and SHALL NOT install anything

#### Scenario: No test command named
- **WHEN** the project's instructions name no test command for the given files
- **THEN** the agent SHALL report that no checks were found and run nothing

#### Scenario: Agent cannot commit or change files
- **WHEN** the agent tries `git commit`, `git push`, `gh` or `rm -rf`
- **THEN** its hook SHALL refuse the call

### Requirement: Apply orchestrator judges tests by exit code
The `jois-code:apply` command SHALL test only through the task in the last group of `tasks.md` that runs the tests. The command SHALL carry out that task itself by dispatching `test-runner`, not by sending it to `task-applier`. It SHALL count the tests as passed only when every reported command shows exit code 0, and a failure SHALL run the fix loop, with `test-runner` dispatched again after each fix round. It SHALL NOT dispatch `test-runner` after any other group or task. When `test-runner` is not installed, the command SHALL say so and name `Install-Toolkit.ps1` before it dispatches the last group.

#### Scenario: Summary says passed but no exit code
- **WHEN** the report of the test task says the tests passed but shows no exit code
- **THEN** the command SHALL treat the tests as not passed and run the fix loop

#### Scenario: Test runner not installed
- **WHEN** `test-runner.md` is in neither `~/.claude/agents/` nor the project's `.claude/agents/`
- **THEN** the command SHALL say so and name `Install-Toolkit.ps1`, and SHALL NOT stop the earlier groups

#### Scenario: Earlier groups never test
- **WHEN** a group other than the last is done
- **THEN** the command SHALL NOT dispatch `test-runner`

#### Scenario: Stall watch applies
- **WHEN** the transcript of the `test-runner` that runs the test task does not change for 3 minutes
- **THEN** the command SHALL raise the same stalled-agent alert as for a task applier

### Requirement: Apply orchestrator never implements and stays advisory
The `jois-code:apply` command SHALL NOT implement a task itself, edit code, call `/opsx:apply`, or edit, copy or regenerate the `/opsx:*` commands. It SHALL be advisory: the toolkit adds no hook that blocks a session from running plain `/opsx:apply`.

#### Scenario: Plain apply unchanged
- **WHEN** a session runs `/opsx:apply` without `/jois-code:apply`
- **THEN** nothing SHALL block it from implementing tasks itself, and the toolkit SHALL NOT edit, copy or regenerate that command

#### Scenario: Orchestrator does not implement
- **WHEN** the command has a group to apply
- **THEN** it SHALL hand the group to `task-applier` and SHALL NOT make the tasks' code changes itself

### Requirement: Task agent description names its use
The `description` of `task-applier` SHALL state that the agent is dispatched for one group of tasks of an OpenSpec change or of a slice, by `/jois-code:apply` or by a session following the apply guidance of `/opsx:apply`, and that the main session SHALL NOT implement those tasks itself, so that the agent list alone tells a session when to use it. The description SHALL keep stating that the agent never commits, pushes, calls GitHub or edits `tasks.md`.

#### Scenario: Agent listed in a session
- **WHEN** a session lists `task-applier` among its available agents
- **THEN** the description SHALL say it is dispatched for one group of tasks, by either apply workflow, instead of the main session implementing them

#### Scenario: Limits still stated
- **WHEN** the description is read
- **THEN** it SHALL still say the agent never commits, pushes, calls GitHub or edits `tasks.md`

### Requirement: Agent files are versioned and checked
Each agent file under `toolkit/agents/` SHALL declare `metadata.version` (semver) and
`metadata.last_updated` (a date) in its frontmatter, and the docs check SHALL fail and name a file
where either is missing or malformed, or where `tools` is missing.

#### Scenario: Missing version
- **WHEN** `toolkit/agents/task-applier.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

### Requirement: Task agent runs plain Bash commands
The `task-applier` agent SHALL run one plain command per Bash call, SHALL NOT chain `cd` with other commands and SHALL use the absolute paths it was given, and SHALL NOT run `rm -rf`, reporting any cleanup as left for the main session.

#### Scenario: One command per call
- **WHEN** the agent needs to list a folder and then check `git status`
- **THEN** it SHALL make two Bash calls and SHALL NOT join them with `;`, `&&` or `cd`

#### Scenario: Cleanup left to the main session
- **WHEN** a task leaves a folder that should be deleted
- **THEN** the agent SHALL NOT run `rm -rf` and its report SHALL say the cleanup is left for the main session

### Requirement: Task agent hook refuses rm -rf
The frontmatter `PreToolUse` hook on `Bash` of `task-applier` SHALL also block a command that runs `rm` with both a recursive and a force flag, in short or long form, with an error saying the cleanup is left for the main session. The toolkit SHALL NOT add an allow rule for `rm`.

#### Scenario: rm -rf attempted
- **WHEN** the agent runs a Bash command containing `rm -rf`
- **THEN** the hook SHALL block it at once with an error naming the rule, and no permission prompt SHALL be raised

#### Scenario: Split or long flags
- **WHEN** the agent runs `rm -r -f x` or `rm --recursive --force x`
- **THEN** the hook SHALL block it as it blocks `rm -rf`

#### Scenario: One flag only
- **WHEN** the agent runs `rm -r x` or `rm -f x`
- **THEN** the hook SHALL NOT block it

#### Scenario: No widened permissions
- **WHEN** the toolkit files are read
- **THEN** none SHALL add an allow rule for `rm`

### Requirement: Apply orchestrator watches a dispatched subagent
When the `jois-code:apply` command dispatches a group it SHALL start a `Monitor` on the subagent's transcript file, `subagents/agent-<id>.jsonl`, and SHALL stop the watch when the report arrives. The command's `allowed-tools` SHALL include `Monitor`.

#### Scenario: Watch started
- **WHEN** the command dispatches a group to `task-applier`
- **THEN** it SHALL start a `Monitor` on that subagent's transcript file before it waits for the report

#### Scenario: Watch stopped
- **WHEN** the subagent's report arrives
- **THEN** the command SHALL stop the watch

#### Scenario: Transcript not found
- **WHEN** the command cannot find the subagent's transcript file
- **THEN** it SHALL say the watch did not start and SHALL NOT skip it silently

## ADDED Requirements

### Requirement: Apply orchestrator command takes a slice
The toolkit SHALL include a command `jois-code:apply`, the single file `toolkit/commands/jois-code/apply.md`, that applies a slice written by `jois-story-plan` by handing its tasks to `task-applier` one group at a time. It SHALL take the argument `slice <backlog>/<slice>`. For any other argument it SHALL ask for that form and do nothing else. An OpenSpec change is applied with `/opsx:apply`, not with this command.

#### Scenario: Slice named
- **WHEN** the user types `/jois-code:apply slice accounts/sign-in`
- **THEN** the command SHALL announce the slice `sign-in` of the backlog `accounts` and work on that slice only

#### Scenario: Any other argument
- **WHEN** the user types `/jois-code:apply sign-in`, `slice` alone, or `slice accounts sign-in`
- **THEN** the command SHALL ask for `slice <backlog>/<slice>` and SHALL NOT dispatch anything

#### Scenario: Slice has no tasks
- **WHEN** the slice's `tasks.md` has no task line
- **THEN** the command SHALL say the slice has no tasks, point to `jois-story-plan` and stop, and SHALL NOT say the slice is built


### Requirement: Apply orchestrator reads the slice and checks it is current
The `jois-code:apply` command SHALL read the slice's `tasks.md` and `UC-<slice>.md`, and SHALL run `read-diagrams.mjs` of the installed `jois-story-plan` skill with `--slice <slice>` before it dispatches anything. It SHALL stop and dispatch nothing when the output says `STALE`, has a `changed:`, `missing:`, `new:` or `ambiguous:` line, or fails, and SHALL say the slice must be redrawn with `jois-story-plan`. When no group has an unticked task it SHALL say the slice is built and name the next stage, and SHALL NOT suggest `/opsx:archive`.

#### Scenario: Slice read first
- **WHEN** the slice's files exist and the plan skill is installed
- **THEN** the command SHALL read `tasks.md` and `UC-<slice>.md` and run the currency check before the first dispatch

#### Scenario: Slice is stale
- **WHEN** the currency check prints `STALE` or a `changed:` line
- **THEN** the command SHALL dispatch nothing, name each story by its title and say the slice must be redrawn

#### Scenario: Plan skill not installed
- **WHEN** `read-diagrams.mjs` is in neither `~/.claude/skills/jois-story-plan/` nor the project's `.claude/skills/jois-story-plan/`
- **THEN** the command SHALL say so, name `Install-Toolkit.ps1` and stop

#### Scenario: Slice already built
- **WHEN** no group has an unticked task
- **THEN** the command SHALL say the slice is built, name the next stage and stop

### Requirement: Apply reviews the slice before the test task
The `jois-code:apply` command SHALL run `jois-code:review` once, after every task of the last group except the test task is done and committed, and before the test task runs. It SHALL pass `slice <backlog>/<slice>`. Its `allowed-tools` SHALL include `Skill`. The static findings of the review and each `not met` verdict of validate SHALL count as failures and SHALL run the existing fix loop, with a fresh `task-applier` dispatch per round, the fix committed as its own `fix` commit, and the review run again after each round. A finding the review reports as a suggestion SHALL be listed in the report and SHALL NOT run the fix loop. The loop SHALL stop and ask the user in the cases the existing fix loop already names. The test task SHALL NOT start while a failure of the review is unexplained or unfixed. The command SHALL NOT pass `--fix` or `--comment` to the review.

#### Scenario: Review comes before the tests
- **WHEN** every non-test task of the last group is done
- **THEN** apply commits that work, runs the review, and dispatches `test-runner` only after the review has no failure left

#### Scenario: A finding is fixed before testing
- **WHEN** the static check finds a correctness bug in the diff
- **THEN** apply dispatches `task-applier` with the finding, commits the fix, runs the review again, and starts the test task only when it is clean

#### Scenario: Both parts of the review count
- **WHEN** the review reports a static finding and a `not met` behavioural verdict
- **THEN** apply SHALL treat both as failures and SHALL NOT merge them into one status

#### Scenario: A failure stays unexplained
- **WHEN** a second fix round ends with a review failure still unexplained
- **THEN** apply stops, shows the failure and asks the user, and does not run the test task

#### Scenario: Review command not installed
- **WHEN** `jois-code/review.md` or its agents are not installed
- **THEN** apply says the review was not run and why, names `Install-Toolkit.ps1`, and does not count the review as passed


### Requirement: Apply guidance hands groups to the task agents
The guidance that `jois-init:opsx` writes under `operations.apply.guidance` of `openspec/config.yaml` SHALL tell the session applying an OpenSpec change to hand each group of tasks, in file order, to `task-applier` instead of implementing the tasks itself, and to hand the final test task to `test-runner` and judge it by exit codes. It SHALL say that the agents commit nothing and that the session records each task's result and ticks the box. Each entry SHALL stay one line, inside the managed markers.

#### Scenario: Change applied with the guidance
- **WHEN** a session runs `/opsx:apply` in a project whose `config.yaml` holds the block
- **THEN** the guidance SHALL tell it to dispatch each group to `task-applier` and the test task to `test-runner`

#### Scenario: Agents missing
- **WHEN** `task-applier` or `test-runner` is not installed
- **THEN** the guidance SHALL tell the session to say so, name `Install-Toolkit.ps1` and not copy the agent itself

#### Scenario: Re-run replaces the block
- **WHEN** `/jois-init:opsx` runs again
- **THEN** it SHALL replace the block in place and SHALL NOT add a second copy

### Requirement: Apply guidance states when a concern is committed without asking
The apply guidance SHALL state in full when the session commits a finished concern without asking for a confirmation word: on a branch other than `main` or `master`, with the concern's tasks done and nothing foreign staged or edited, with the test task as the only check that gates a commit and no test required between groups, and never pushing. It SHALL NOT restate the steps of the `jois-git-commit-hygiene` rule beyond those conditions.

#### Scenario: Commit without a word
- **WHEN** a group of a change is done on branch `feat/x` and only its own files changed
- **THEN** the guidance SHALL permit the session to stage by explicit path and commit it without asking for a word, and SHALL say no test has to run first

#### Scenario: Protected branch
- **WHEN** the branch is `main`, `master` or a detached HEAD
- **THEN** the guidance SHALL send the session back to the confirmation-word path of the commit rule

#### Scenario: No push
- **WHEN** the last group is committed
- **THEN** the guidance SHALL tell the session not to push

### Requirement: Old agent files are removed by hand
The installer SHALL NOT delete `opsx-task-applier.md` or `opsx-test-runner.md` from `~/.claude/agents/` or a project's `.claude/agents/`. The wiki page on installing the toolkit SHALL tell a user who has them to remove them by hand after installing `task-applier.md` and `test-runner.md`.

#### Scenario: Old files present at install
- **WHEN** the installer runs on a machine that has `opsx-task-applier.md`
- **THEN** it SHALL install `task-applier.md` and SHALL leave `opsx-task-applier.md` untouched

#### Scenario: Docs name the cleanup
- **WHEN** the install page is read
- **THEN** it SHALL name both old file names and say to delete them by hand
