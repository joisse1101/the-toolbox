## ADDED Requirements

### Requirement: Apply reviews before the test task
The `jois-code:apply` command SHALL run `jois-code:review` once, after every task of the last group except the test task is done and committed, and before the test task runs. It SHALL pass `slice <backlog>/<slice>` in the slice form and nothing in the OpenSpec form. Its `allowed-tools` SHALL include `Skill`. The static findings of the review and each `not met` verdict of validate SHALL count as failures and SHALL run the existing fix loop, with a fresh `opsx-task-applier` dispatch per round, the fix committed as its own `fix` commit, and the review run again after each round. A finding the review reports as a suggestion SHALL be listed in the report and SHALL NOT run the fix loop. The loop SHALL stop and ask the user in the cases the existing fix loop already names. The test task SHALL NOT start while a failure of the review is unexplained or unfixed. The command SHALL NOT pass `--fix` or `--comment` to the review.

#### Scenario: Review comes before the tests
- **WHEN** every non-test task of the last group is done
- **THEN** apply commits that work, runs the review, and dispatches `opsx-test-runner` only after the review has no failure left

#### Scenario: A finding is fixed before testing
- **WHEN** the static check finds a correctness bug in the diff
- **THEN** apply dispatches `opsx-task-applier` with the finding, commits the fix, runs the review again, and starts the test task only when it is clean

#### Scenario: OpenSpec form has no validate
- **WHEN** apply runs for an OpenSpec change
- **THEN** the review runs the static check only and apply reports that no behavioural check was run

#### Scenario: A failure stays unexplained
- **WHEN** a second fix round ends with a review failure still unexplained
- **THEN** apply stops, shows the failure and asks the user, and does not run the test task

#### Scenario: Review command not installed
- **WHEN** `jois-code/review.md` or its agents are not installed
- **THEN** apply says the review was not run and why, names `Install-Toolkit.ps1`, and does not count the review as passed
