## ADDED Requirements

### Requirement: Task agent runs plain Bash commands
The `opsx-task-applier` agent SHALL run one plain command per Bash call, SHALL NOT chain `cd` with other commands and SHALL use the absolute paths it was given, and SHALL NOT run `rm -rf`, reporting any cleanup as left for the main session.

#### Scenario: One command per call
- **WHEN** the agent needs to list a folder and then check `git status`
- **THEN** it SHALL make two Bash calls and SHALL NOT join them with `;`, `&&` or `cd`

#### Scenario: Cleanup left to the main session
- **WHEN** a task leaves a folder that should be deleted
- **THEN** the agent SHALL NOT run `rm -rf` and its report SHALL say the cleanup is left for the main session

### Requirement: Task agent hook refuses rm -rf
The frontmatter `PreToolUse` hook on `Bash` of `opsx-task-applier` SHALL also block a command that runs `rm -rf`, with an error saying the cleanup is left for the main session. The toolkit SHALL NOT add an allow rule for `rm`.

#### Scenario: rm -rf attempted
- **WHEN** the agent runs a Bash command containing `rm -rf`
- **THEN** the hook SHALL block it at once with an error naming the rule, and no permission prompt SHALL be raised

#### Scenario: No widened permissions
- **WHEN** the toolkit files are read
- **THEN** none SHALL add an allow rule for `rm`

### Requirement: Apply orchestrator watches a dispatched subagent
When the `jois-code:apply` command dispatches a group it SHALL start a `Monitor` on the subagent's transcript file, `subagents/agent-<id>.jsonl`, and SHALL stop the watch when the report arrives. The command's `allowed-tools` SHALL include `Monitor`.

#### Scenario: Watch started
- **WHEN** the command dispatches a group to `opsx-task-applier`
- **THEN** it SHALL start a `Monitor` on that subagent's transcript file before it waits for the report

#### Scenario: Watch stopped
- **WHEN** the subagent's report arrives
- **THEN** the command SHALL stop the watch

#### Scenario: Transcript not found
- **WHEN** the command cannot find the subagent's transcript file
- **THEN** it SHALL say the watch did not start and SHALL NOT skip it silently

### Requirement: Apply orchestrator flags a stalled subagent
If the watched transcript file has not changed for 3 minutes, the `jois-code:apply` command SHALL say in its own reply that the subagent looks stalled and is probably waiting for a permission approval, SHALL show the subagent's last tool call, and SHALL say how to open the subagent's transcript to approve it. It SHALL NOT report that all is well while the file is unchanged and SHALL NOT change any permission rule.

#### Scenario: Transcript quiet for 3 minutes
- **WHEN** the transcript file has not changed for 3 minutes before the report arrives
- **THEN** the command SHALL tell the user the subagent looks stalled and is probably waiting for an approval, show its last tool call, and say where to open the transcript

#### Scenario: Transcript still changing
- **WHEN** the transcript file changes at least every 3 minutes
- **THEN** the command SHALL NOT say the subagent looks stalled

#### Scenario: Permission rules untouched
- **WHEN** the command flags a stalled subagent
- **THEN** it SHALL NOT edit any settings or permission rule
