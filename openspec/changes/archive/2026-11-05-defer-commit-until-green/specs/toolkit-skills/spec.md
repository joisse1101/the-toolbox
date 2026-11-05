## MODIFIED Requirements

### Requirement: Apply orchestrator commits a checked group on an unprotected branch
On a named branch other than `main` or `master`, the `jois-code:apply` command SHALL commit a finished group without a confirmation word only when all of these hold: a test run of the group's changed files passed, the group is one concern, and nothing other than the group's own files is staged or edited. Otherwise it SHALL follow the stop-for-confirmation path and SHALL say which condition failed, except when the only failure is a deferrable test failure, which defers the commit instead.

#### Scenario: Passing group on a feature branch
- **WHEN** a group is done on branch `feat/x`, every reported test command exited 0, and only the group's files changed
- **THEN** the command SHALL stage those files by explicit path, commit them once, print the short hash and message, and take the next group

#### Scenario: Failing test run
- **WHEN** a reported test command exits non-zero and no pending task of a later group is named as its fix
- **THEN** the command SHALL NOT commit, SHALL show the failure, and SHALL stop for the confirmation word

#### Scenario: Group is more than one concern
- **WHEN** the group's diff is over about 200 lines or 5 files, or spans more than one layer
- **THEN** the command SHALL stop for the confirmation word

#### Scenario: Foreign changes present
- **WHEN** a file outside the group's reported files is staged or edited
- **THEN** the command SHALL NOT stage it and SHALL stop for the confirmation word

#### Scenario: A tracked file changes during the test run
- **WHEN** a tracked file differs after the test run from what the group reported
- **THEN** the command SHALL stop for the confirmation word

### Requirement: Apply orchestrator judges tests by exit code
The `jois-code:apply` command SHALL dispatch `opsx-test-runner` with the group's changed files and SHALL count the tests as passed only when every reported command shows exit code 0. It SHALL stop for the confirmation word when there is no test command, a suite could not run, an exit code is missing, the agent is not installed, or an exit code is non-zero and the failure is not deferrable. In the not-installed case it SHALL name `Install-Toolkit.ps1` and SHALL NOT stop the whole command.

#### Scenario: Summary says passed but no exit code
- **WHEN** the report says the tests passed but shows no exit code
- **THEN** the command SHALL treat the tests as not passed and stop for the confirmation word

#### Scenario: Test runner not installed
- **WHEN** `opsx-test-runner.md` is in neither `~/.claude/agents/` nor the project's `.claude/agents/`
- **THEN** the command SHALL say so, name `Install-Toolkit.ps1`, and stop for the confirmation word without ending the command

#### Scenario: Stall watch applies
- **WHEN** the test-runner transcript does not change for 3 minutes
- **THEN** the command SHALL raise the same stalled-agent alert as for the task applier

## ADDED Requirements

### Requirement: Apply orchestrator defers a commit while a pending task fixes the failure
When a finished group's tests fail, the `jois-code:apply` command SHALL NOT commit the group and SHALL take the next group without asking the user, provided every failure is deferrable. A failure is deferrable only when the `Failures` part gives the command, the exact output line and the cause, and names a task that is still pending in `tasks.md` in a later group as the one that fixes it.

#### Scenario: Failure fixed by a pending task of a later group
- **WHEN** group 1 is done, a test command exits non-zero, and the failure names pending task 2.3 as its fix
- **THEN** the command SHALL NOT commit group 1, SHALL say which task it waits for, and SHALL dispatch group 2 without stopping

#### Scenario: Vague promise is not enough
- **WHEN** a report says a later group will fix the failure but names no pending task
- **THEN** the command SHALL treat the failure as not deferrable and run the fix loop

#### Scenario: Named task is not pending
- **WHEN** the task named as the fix is already ticked or does not exist in `tasks.md`
- **THEN** the command SHALL treat the failure as not deferrable

### Requirement: Apply orchestrator commits held-back groups once the tests are green
After each group taken while a commit is deferred, the `jois-code:apply` command SHALL rerun the tests. When every command exits 0 it SHALL stage and commit all held-back changes by explicit path, cut into commits by concern as the `jois-git-commit-hygiene` rule says, and SHALL NOT commit while any command is red. When the last group has been taken nothing is left to defer to, so a red result SHALL run the fix loop and then ask the user as before.

#### Scenario: Tests turn green at a later group
- **WHEN** groups 1 and 2 are done, group 1 is held back, and every test command now exits 0
- **THEN** the command SHALL commit the held-back changes of both groups, one commit per concern, print each short hash and message, and take the next group

#### Scenario: Still red but fixable by another pending task
- **WHEN** a later group is done, tests are still red, and the failure names another pending task
- **THEN** the command SHALL keep holding the commit and take the next group

#### Scenario: Last group ends red
- **WHEN** the last group is done and a test command still exits non-zero
- **THEN** the command SHALL NOT defer, SHALL run the fix loop over the whole change, and SHALL ask the user if a failure stays unexplained

#### Scenario: Held-back groups share a file
- **WHEN** two held-back groups changed the same file
- **THEN** the command SHALL keep that file in one commit and SHALL NOT try to split it between groups
