# Spec Delta

## MODIFIED Requirements

### Requirement: Scope limited to skill, command and rule folders
The installer SHALL write only inside the chosen skills, commands, rules and agents folders, plus the one key `CLAUDE_CODE_SUBAGENT_MODEL` in the `env` object of the chosen scope's Claude Code `settings.json` (and a backup copy of that file), as the `toolkit-subagent-model` capability describes. It SHALL NOT modify any other Claude Code setting, any hook, or any other configuration.

#### Scenario: Settings untouched
- **WHEN** an uninstall completes, or an install that names a skill, command, rule or agent completes
- **THEN** `settings.json` files SHALL be unchanged

#### Scenario: Other settings untouched
- **WHEN** a full install completes
- **THEN** every `settings.json` key other than `env.CLAUDE_CODE_SUBAGENT_MODEL` SHALL be unchanged
