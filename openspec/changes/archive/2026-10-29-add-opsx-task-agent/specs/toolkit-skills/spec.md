## ADDED Requirements

### Requirement: Agents source of truth
The repository SHALL keep every custom Claude Code agent under `toolkit/agents/`. Each entry directly
under it SHALL be a single `.md` file with `name`, `description` and `tools` frontmatter, and is the
unit the installer acts on.

#### Scenario: Agent file is one unit
- **WHEN** `toolkit/agents/opsx-task-applier.md` exists
- **THEN** the installer SHALL treat `opsx-task-applier.md` as one agent item and copy that file

#### Scenario: Agent without a tool list
- **WHEN** an agent file under `toolkit/agents/` has no `tools` frontmatter
- **THEN** the docs check SHALL fail and name the file, because an omitted list inherits every tool

### Requirement: Task agent applies one OpenSpec task
The toolkit SHALL include an agent `opsx-task-applier` that applies exactly one task of an OpenSpec
change, handed to it by the main session with the task text and the change's artifacts to read. Its
tool list SHALL be limited to `Read`, `Grep`, `Glob`, `Edit`, `Write` and `Bash`, it SHALL declare a
turn limit, and it SHALL carry a frontmatter `PreToolUse` hook on `Bash` that blocks a command that
runs `git commit`, `git push` or `gh`. It SHALL NOT edit `tasks.md`, SHALL NOT edit or regenerate the
`/opsx:*` commands, and SHALL NOT commit, push or call GitHub. When the task needs a decision it
cannot make from the task text and the artifacts, it SHALL stop and report `blocked: <question>`
and SHALL NOT guess.

#### Scenario: Commit attempted
- **WHEN** the agent runs a Bash command containing `git commit`
- **THEN** the hook SHALL block it with an error naming the rule, and nothing SHALL be committed

#### Scenario: Push or GitHub call attempted
- **WHEN** the agent runs a Bash command containing `git push` or `gh`
- **THEN** the hook SHALL block it

#### Scenario: Turn limit reached
- **WHEN** the agent reaches its turn limit before the task is done
- **THEN** its report SHALL say what is done and what is not, so the main session can resume it or ask the user

#### Scenario: Decision needed
- **WHEN** the task needs a choice that the task text and the change artifacts do not settle
- **THEN** the agent SHALL end its report with `blocked: <question>` and make no change that depends on the answer

### Requirement: Task agent reports only what it saw
The agent's report SHALL list the files it changed; the commands it ran, each with the result its
output showed and any counts that output gave; the manual checks it made; the items it could not
verify; and a single `result:` clause for the task. The clause SHALL contain only commands and
outcomes the agent ran and saw, and SHALL be written so that the main session can copy it into
`tasks.md` without rewording. The report SHALL NOT state a result the agent did not observe, and
SHALL NOT quote a count its output did not give.

#### Scenario: A command was run
- **WHEN** the agent runs a test command and its output shows 12 passed and 0 failed
- **THEN** the report SHALL list the command with that result, and the `result:` clause SHALL carry the same figures

#### Scenario: A check was not possible
- **WHEN** the agent could not run a check the task asked for
- **THEN** the report SHALL list it under unverified and the `result:` clause SHALL NOT claim it passed

#### Scenario: Report shape for write-pr
- **WHEN** the main session copies the `result:` clause into the task's line in `tasks.md`
- **THEN** `write-pr` SHALL read it as a task that records its outcome, with no change to `write-pr`

### Requirement: Apply guidance delegates tasks to the agent
The guidance that `jois-init:opsx` writes for `operations.apply`, between its begin and end markers,
SHALL include a line asking the main session to hand each task to `opsx-task-applier` one at a time,
to wait for each report before the next dispatch, to announce each dispatch, and to copy the report's
`result:` clause verbatim into the task's line in `tasks.md`. The announcement SHALL name the task and
the files it expects to touch, give a rough time estimate labeled as an estimate, say that there is no
live timer, say how to open the agent's transcript, and state the agent's turn limit. After each
report the main session SHALL say in one line whether the task is done, failed or blocked. The line
SHALL be advisory, SHALL NOT restate the commit rule's steps, and the command SHALL NOT edit,
copy or regenerate the `/opsx:*` commands.

#### Scenario: Guidance written
- **WHEN** `jois-init:opsx` merges its guidance into `openspec/config.yaml`
- **THEN** the `operations.apply` block between its markers SHALL contain the commit-stop line and the delegation line, and nothing outside the markers SHALL change

#### Scenario: Announcement before a dispatch
- **WHEN** the main session hands a task to the agent
- **THEN** it SHALL first say which task, the files expected, the labeled estimate, that there is no live timer, and where to open the transcript

#### Scenario: Agent not installed
- **WHEN** `jois-init:opsx` runs and `opsx-task-applier` is not installed globally or in the project
- **THEN** it SHALL say so and name `Install-Toolkit.ps1`, and SHALL NOT copy the agent itself

#### Scenario: Commit stop still applies
- **WHEN** a concern's tasks are all reported
- **THEN** the main session SHALL still stop and follow the `jois-git-commit-hygiene` rule, and the agents SHALL have committed nothing

### Requirement: Agent files are versioned and checked
Each agent file under `toolkit/agents/` SHALL declare `metadata.version` (semver) and
`metadata.last_updated` (a date) in its frontmatter, and the docs check SHALL fail and name a file
where either is missing or malformed, or where `tools` is missing.

#### Scenario: Missing version
- **WHEN** `toolkit/agents/opsx-task-applier.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

## MODIFIED Requirements

### Requirement: Install by copy into a global or project scope
The installer SHALL copy skills from `toolkit/skills/` into Claude Code's skills folder, commands
from `toolkit/commands/` into its commands folder, rules from `toolkit/rules/` into its rules
folder, and agents from `toolkit/agents/` into its agents folder: the user's `~/.claude/skills/`,
`~/.claude/commands/`, `~/.claude/rules/` and `~/.claude/agents/` for global scope, or
`<project>/.claude/skills/`, `<project>/.claude/commands/`, `<project>/.claude/rules/` and
`<project>/.claude/agents/` for project scope. It SHALL install only the named skill, command item,
rule and/or agent when given and everything otherwise. Destinations SHALL come from a data file, not
code, so adding a tool is adding an entry.

#### Scenario: Global install of everything
- **WHEN** the installer runs with global scope and no item name
- **THEN** every skill under `toolkit/skills/` SHALL exist in `~/.claude/skills/`, every command item under `toolkit/commands/` SHALL exist in `~/.claude/commands/`, every rule under `toolkit/rules/` SHALL exist in `~/.claude/rules/`, and every agent under `toolkit/agents/` SHALL exist in `~/.claude/agents/`

#### Scenario: Project install of named items
- **WHEN** the installer runs with project scope, a project path and a skill, command, rule and/or agent name
- **THEN** only those items SHALL be copied under `<project>/.claude/`

#### Scenario: Unknown name
- **WHEN** a skill, command, rule or agent name is given that is not in the toolkit
- **THEN** the installer SHALL fail with a message naming the available items and copy nothing

#### Scenario: No agents folder
- **WHEN** `toolkit/agents/` does not exist
- **THEN** the installer SHALL complete and install the other kinds without error

### Requirement: No silent overwrite of a differing item
If a destination skill, command item, rule or agent already exists and its contents differ from the
toolkit's, the installer SHALL NOT overwrite it unless explicitly told to, and SHALL report that it
differs.

#### Scenario: Drifted copy present
- **WHEN** the destination item differs from the toolkit's copy and no force option is given
- **THEN** that item SHALL be left unchanged and reported as differing

#### Scenario: Identical copy present
- **WHEN** the destination item is identical to the toolkit's
- **THEN** the installer SHALL report it as up to date and change nothing

### Requirement: Status listing and safe uninstall
The installer SHALL be able to list each toolkit item's state at a destination (missing, up to date,
or differing), and SHALL be able to remove items, removing only items that exist in the toolkit and
never any other skill, command, rule or agent found in the destination.

#### Scenario: Uninstall leaves foreign items alone
- **WHEN** the destination contains a skill, command, rule or agent that is not in the toolkit and uninstall runs
- **THEN** that item SHALL remain untouched, including the agents already in `~/.claude/agents/` that the toolkit does not ship

### Requirement: Scope limited to skill, command and rule folders
The installer SHALL write only inside the chosen skills, commands, rules and agents folders and SHALL
NOT modify Claude Code settings, hooks, or any other configuration.

#### Scenario: Settings untouched
- **WHEN** any install or uninstall completes
- **THEN** `settings.json` files SHALL be unchanged
