## ADDED Requirements

### Requirement: The command can be called by another command
The `jois-code:review` command SHALL NOT carry `disable-model-invocation`, so that `jois-code:apply` can start it with the Skill tool. Its rules SHALL stay as they are: it never edits the code, never commits or pushes, never passes `--fix`, and runs the behavioural check only when a slice or a PR number is given. When `jois-code:apply` calls it for an OpenSpec change, which has no slice and no PR, it SHALL run the static check only and SHALL say the behavioural check was not run for lack of a slice or PR number, without asking the user for one.

#### Scenario: Called by apply for an OpenSpec change
- **WHEN** `jois-code:apply` calls review for an OpenSpec change
- **THEN** review runs the static check, says the behavioural check was not run because no slice or PR number was given, and asks no question

#### Scenario: Called by apply for a slice
- **WHEN** `jois-code:apply` calls review with `slice <backlog>/<slice>`
- **THEN** review runs the static check and then validate for that slice, and prints the one report with its two parts
