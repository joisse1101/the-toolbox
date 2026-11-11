# toolkit-subagent-model Specification

## Purpose

Keeps subagents and headless Claude Code sessions on Sonnet, or on Haiku for pure search, so delegated work does not run on the main session's more expensive model, and keeps a delegated task's context narrow.

## Requirements

### Requirement: Subagent rule loads in every session
The toolkit SHALL provide a rule `jois-env-subagents` at `toolkit/rules/jois-env-subagents.md` with no `paths:` frontmatter and with `metadata.version` and `metadata.last_updated`. The docs check SHALL list it among the unscoped rules and SHALL fail when it gains `paths:` frontmatter.

#### Scenario: Rule applies whatever files are touched
- **WHEN** a session delegates work before it touches any file
- **THEN** the subagent rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Rule gains paths
- **WHEN** the docs check runs and `jois-env-subagents.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name that file

### Requirement: Subagents run on Sonnet or Haiku
The rule SHALL tell Claude to pass `model: sonnet` on every Agent call, to pass `haiku` only for a task that is pure file or keyword search, and never to pass `opus` or rely on inheriting the main model unless the user asks for another model. It SHALL state the order in which Claude Code picks a model: the call's model, then the agent file's `model`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main session's model.

#### Scenario: Ordinary delegated task
- **WHEN** Claude starts a subagent for a task that edits files or reasons over code
- **THEN** the rule SHALL direct it to pass `model: sonnet`

#### Scenario: Search-only task
- **WHEN** Claude starts a subagent only to find files or text
- **THEN** the rule SHALL allow it to pass `model: haiku`

#### Scenario: The user names a model
- **WHEN** the user asks for a specific model for a subagent
- **THEN** the rule SHALL NOT stop Claude from passing that model

### Requirement: Headless sessions are narrowed and pinned
The rule SHALL tell Claude to start a headless session (`claude -p`) with `--model sonnet`, `--disable-slash-commands` and `--strict-mcp-config`, and to name the tools it needs with `--allowedTools`. It SHALL NOT tell Claude to use `--bare`, because `--bare` reads no login and needs an API key.

#### Scenario: Headless run
- **WHEN** Claude starts a headless session
- **THEN** the rule SHALL direct it to include `--model sonnet`, `--disable-slash-commands` and `--strict-mcp-config`

### Requirement: Ordinary delegated work goes to the worker agent
The rule SHALL tell Claude to use the `jois-worker` agent for ordinary delegated work, and to use `general-purpose` only when the task needs the Skill tool. It SHALL keep the instruction that a subagent that can write files appends a progress line to `.scratch/agents/<agent>.log`, by pointing to `jois-env-stay-in-repo`.

#### Scenario: Worker preferred
- **WHEN** Claude delegates a task that needs no skill
- **THEN** the rule SHALL direct it to use `jois-worker`

### Requirement: Worker agent has a narrow context
The toolkit SHALL include an agent `jois-worker`, the single file `toolkit/agents/jois-worker.md`, on the `sonnet` model with the tools `Read`, `Grep`, `Glob`, `Edit`, `Write` and `Bash` and no `Skill` tool, a declared turn limit, a frontmatter `PreToolUse` hook on `Bash` that blocks `git commit`, `git push` and `gh`, and `metadata.version` and `metadata.last_updated`. It SHALL NOT omit the user's rules or `CLAUDE.md` from its context.

#### Scenario: No skills list
- **WHEN** `jois-worker` runs
- **THEN** its tool list SHALL NOT include `Skill`, so it sees no list of available skills

#### Scenario: Agent without a model
- **WHEN** an agent file under `toolkit/agents/` has no `model` frontmatter
- **THEN** the docs check SHALL NOT fail on that account, because the check only requires `tools`

### Requirement: Toolkit agents pin their model
`opsx-task-applier` and `code-validator` SHALL declare `model: sonnet` in their frontmatter, and `opsx-test-runner` SHALL keep `model: haiku`. Each changed agent SHALL have its `metadata.version` and `metadata.last_updated` updated.

#### Scenario: Pinned agents
- **WHEN** the files under `toolkit/agents/` are read
- **THEN** `opsx-task-applier.md` and `code-validator.md` SHALL declare `sonnet`, `opsx-test-runner.md` SHALL declare `haiku` and `jois-worker.md` SHALL declare `sonnet`

### Requirement: Installer sets the default subagent model
On a full install (no item name given), the installer SHALL ensure `CLAUDE_CODE_SUBAGENT_MODEL` is `sonnet` in the `env` object of Claude Code's `settings.json` for the chosen scope, creating the file or the `env` object when missing and keeping every other key. It SHALL NOT set `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.

#### Scenario: Settings file missing
- **WHEN** a full global install runs and `~/.claude/settings.json` does not exist
- **THEN** the installer SHALL create it with `env.CLAUDE_CODE_SUBAGENT_MODEL` set to `sonnet`

#### Scenario: Other keys kept
- **WHEN** the settings file holds other keys and an `env` object with other variables
- **THEN** after the install every other key and variable SHALL have the value it had before

#### Scenario: Value already sonnet
- **WHEN** the key is already `sonnet`
- **THEN** the installer SHALL report it as up to date and SHALL NOT write the file

#### Scenario: Named items only
- **WHEN** the installer runs with a skill, command, rule or agent name
- **THEN** it SHALL NOT read or change `settings.json`

#### Scenario: Force variable never written
- **WHEN** any install completes
- **THEN** `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` SHALL NOT have been added by the installer

### Requirement: Installer asks before replacing a different value
When `CLAUDE_CODE_SUBAGENT_MODEL` already holds a value other than `sonnet`, the installer SHALL warn, state what overwriting and skipping each do, and ask the user which to choose. It SHALL explain that overwriting replaces the current value so that a subagent with no model passed or pinned runs on Sonnet, and that skipping keeps the current value so that such a subagent keeps its current default.

#### Scenario: A person is at the console
- **WHEN** the key holds another value and the installer runs interactively
- **THEN** it SHALL print the current value, both effects and a question, and SHALL act on the answer

#### Scenario: Unattended run
- **WHEN** the key holds another value and no person can answer
- **THEN** the installer SHALL skip, print a warning that names the current value and how to overwrite, and exit without failing

#### Scenario: Choice given as a parameter
- **WHEN** the installer is given `-SubagentModel Overwrite` or `-SubagentModel Skip`
- **THEN** it SHALL apply that choice without asking

#### Scenario: Step switched off
- **WHEN** the installer is given `-NoSettings`
- **THEN** it SHALL NOT read or change `settings.json`

### Requirement: Installer protects the settings file
Before it changes an existing `settings.json`, the installer SHALL save a copy beside it. If the file is not valid JSON, the installer SHALL change nothing, name the file and the parse error, and exit non-zero.

#### Scenario: Backup before write
- **WHEN** the installer changes an existing settings file
- **THEN** a copy with the earlier contents SHALL exist beside it

#### Scenario: Invalid JSON
- **WHEN** the settings file is not valid JSON
- **THEN** the installer SHALL leave it byte-for-byte unchanged and SHALL exit non-zero with a message naming the file

### Requirement: Listing and uninstall cover the setting
The installer's status listing SHALL show the key's state (missing, up to date or a different value). Uninstall SHALL leave the key unchanged and SHALL print the line to remove by hand, because the installer cannot tell its own value from one the user set.

#### Scenario: Listing
- **WHEN** the installer runs with `-List`
- **THEN** it SHALL print the key's state without changing any file

#### Scenario: Uninstall
- **WHEN** the installer runs with `-Uninstall`
- **THEN** `settings.json` SHALL be unchanged and the output SHALL name the key to remove by hand
