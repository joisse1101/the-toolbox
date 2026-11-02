# Spec Delta

## MODIFIED Requirements

### Requirement: Apply orchestrator stops for a commit after each group
After each completed group the `jois-code:apply` command SHALL follow the `jois-git-commit-hygiene` rule, without restating that rule's steps, before it dispatches the next group. On a protected branch, or when any condition of the auto-commit requirements fails, it SHALL stop for the confirmation word as the rule says. It SHALL treat `main`, `master`, a detached HEAD and an unreadable branch name as protected.

#### Scenario: Commit stop after a group
- **WHEN** a group's tasks are all reported done on a protected branch
- **THEN** the command SHALL stop and follow the `jois-git-commit-hygiene` rule, and the agent SHALL have committed nothing

#### Scenario: Detached HEAD counts as protected
- **WHEN** `git branch --show-current` prints nothing
- **THEN** the command SHALL stop for the confirmation word instead of committing

#### Scenario: Branch name cannot be read
- **WHEN** the command that reads the branch name fails
- **THEN** the command SHALL treat the branch as protected and stop for the confirmation word

## ADDED Requirements

### Requirement: Apply orchestrator commits a checked group on an unprotected branch
On a named branch other than `main` or `master`, the `jois-code:apply` command SHALL commit a finished group without a confirmation word only when all of these hold: a test run of the group's changed files passed, the group is one concern, and nothing other than the group's own files is staged or edited. Otherwise it SHALL follow the stop-for-confirmation path and SHALL say which condition failed.

#### Scenario: Passing group on a feature branch
- **WHEN** a group is done on branch `feat/x`, every reported test command exited 0, and only the group's files changed
- **THEN** the command SHALL stage those files by explicit path, commit them once, print the short hash and message, and take the next group

#### Scenario: Failing test run
- **WHEN** a reported test command exits non-zero
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

### Requirement: Apply orchestrator commits within hygiene limits and never pushes
An automatic commit by the `jois-code:apply` command SHALL stage by explicit path, SHALL use a `type(scope): subject` message, and SHALL NOT use `git add .`, `-A`, `-a`, `--amend` or `--no-verify`. The command SHALL NOT run `git push` on any branch, and its `allowed-tools` SHALL NOT include `git push`.

#### Scenario: Message format
- **WHEN** the command commits a group automatically
- **THEN** the message SHALL read like `feat(toolkit): add test runner agent`, lowercase, imperative, without a trailing period

#### Scenario: No push
- **WHEN** the command has committed the last group on any branch
- **THEN** it SHALL NOT run `git push`

#### Scenario: Hook rejects the commit
- **WHEN** a pre-commit hook rejects the automatic commit
- **THEN** the command SHALL stop and report the rejection, and SHALL NOT retry or use `--no-verify`

#### Scenario: Commit fails
- **WHEN** `git commit` fails for another reason
- **THEN** the command SHALL stop and report the error instead of asking for a word

### Requirement: Apply front matter matches the commit behavior
The `allowed-tools` of `jois-code:apply` SHALL include `Bash(git commit:*)` and `Bash(git branch --show-current:*)`. Its `description` SHALL say that the command commits a finished group by itself on an unprotected branch, and its `metadata.version` and `metadata.last_updated` SHALL be raised.

#### Scenario: Front matter updated
- **WHEN** the command file is read
- **THEN** `allowed-tools` SHALL list both git entries, `git push` SHALL be absent, and the description SHALL mention the automatic commit

### Requirement: Test runner agent reports test results
The toolkit SHALL include an agent `opsx-test-runner`, the single file `toolkit/agents/opsx-test-runner.md`, on the `haiku` model with the tools `Read, Grep, Glob, Bash` and no `Edit` or `Write`. It SHALL run only test commands that the project's own instructions name, choosing the suites that cover the files it is given, and SHALL install nothing. It SHALL report, per command, the exact command line, the exit code and the counts line as printed, and SHALL list the suites it did not run.

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
The `jois-code:apply` command SHALL dispatch `opsx-test-runner` with the group's changed files and SHALL count the tests as passed only when every reported command shows exit code 0. It SHALL stop for the confirmation word when there is no test command, a suite could not run, an exit code is missing or non-zero, or the agent is not installed. In the last case it SHALL name `Install-Toolkit.ps1` and SHALL NOT stop the whole command.

#### Scenario: Summary says passed but no exit code
- **WHEN** the report says the tests passed but shows no exit code
- **THEN** the command SHALL treat the tests as not passed and stop for the confirmation word

#### Scenario: Test runner not installed
- **WHEN** `opsx-test-runner.md` is in neither `~/.claude/agents/` nor the project's `.claude/agents/`
- **THEN** the command SHALL say so, name `Install-Toolkit.ps1`, and stop for the confirmation word without ending the command

#### Scenario: Stall watch applies
- **WHEN** the test-runner transcript does not change for 3 minutes
- **THEN** the command SHALL raise the same stalled-agent alert as for the task applier
