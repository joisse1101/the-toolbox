## MODIFIED Requirements

### Requirement: Apply orchestrator commits a checked group on an unprotected branch
On a named branch other than `main` or `master`, the `jois-code:apply` command SHALL commit a finished group without a confirmation word only when all of these hold: the group's tasks are all done, the group is one concern, and nothing other than the group's own files is staged or edited. It SHALL NOT run any test between groups. Otherwise it SHALL follow the stop-for-confirmation path and SHALL say which condition failed.

#### Scenario: Passing group on a feature branch
- **WHEN** a group's tasks are all done on branch `feat/x` and only the group's files changed
- **THEN** the command SHALL stage those files by explicit path, commit them once, print the short hash and message, and take the next group without dispatching `opsx-test-runner`

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

### Requirement: Apply orchestrator judges tests by exit code
The `jois-code:apply` command SHALL test only through the task in the last group of `tasks.md` that runs the tests. The command SHALL carry out that task itself by dispatching `opsx-test-runner`, not by sending it to `opsx-task-applier`. It SHALL count the tests as passed only when every reported command shows exit code 0, and a failure SHALL run the fix loop, with `opsx-test-runner` dispatched again after each fix round. It SHALL NOT dispatch `opsx-test-runner` after any other group or task. When `opsx-test-runner` is not installed, the command SHALL say so and name `Install-Toolkit.ps1` before it dispatches the last group.

#### Scenario: Summary says passed but no exit code
- **WHEN** the report of the test task says the tests passed but shows no exit code
- **THEN** the command SHALL treat the tests as not passed and run the fix loop

#### Scenario: Test runner not installed
- **WHEN** `opsx-test-runner.md` is in neither `~/.claude/agents/` nor the project's `.claude/agents/`
- **THEN** the command SHALL say so and name `Install-Toolkit.ps1`, and SHALL NOT stop the earlier groups

#### Scenario: Earlier groups never test
- **WHEN** a group other than the last is done
- **THEN** the command SHALL NOT dispatch `opsx-test-runner`

#### Scenario: Stall watch applies
- **WHEN** the transcript of the `opsx-test-runner` that runs the test task does not change for 3 minutes
- **THEN** the command SHALL raise the same stalled-agent alert as for a task applier

## ADDED Requirements

### Requirement: The last group of every task list ends with a test task
The tasks of an OpenSpec change and of a slice SHALL end, in the last group, with a task that runs the project's own test commands for the whole change and completes any fixes the failures need. For an OpenSpec change the tasks artifact rule SHALL ask for it. For a slice the `jois-story-plan` skill SHALL write it as the last task of the last flow group, with a `Satisfies:` line that names AC ids and step ids of that group's flow, and a `Verify:` line that names the test commands.

#### Scenario: OpenSpec change tasks
- **WHEN** `opsx:propose` writes `tasks.md`
- **THEN** the last group SHALL hold a task that runs the project's tests and fixes failures

#### Scenario: Slice tasks
- **WHEN** the plan skill drafts a slice's `tasks.md`
- **THEN** the last task of the last `## <flow>` group SHALL run the tests, and the file SHALL still pass the tasks check

## REMOVED Requirements

### Requirement: Apply orchestrator defers a commit while a pending task fixes the failure
**Reason**: Tests no longer run between groups, so no group can fail them while a later group is still pending.
**Migration**: A failure in the final test task runs the fix loop instead.

### Requirement: Apply orchestrator commits held-back groups once the tests are green
**Reason**: Without a deferral there is nothing to hold back; each group commits when its tasks are done.
**Migration**: None.
