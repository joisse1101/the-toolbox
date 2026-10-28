## REMOVED Requirements

### Requirement: Commands stay out of the session context
**Reason**: No skill ships any more, so its "Skill stays discoverable" scenario no longer applies; a MODIFIED requirement cannot drop a scenario.
**Migration**: Replaced by "Commands are hidden from the session context".

## ADDED Requirements

### Requirement: Commands are hidden from the session context
Every command file under `toolkit/commands/`, including the `opsx` set, SHALL declare
`disable-model-invocation: true` in its frontmatter, so its description is not loaded into a new
session's skill listing while the user can still invoke it by name. Skills SHALL NOT be given this
flag by this requirement. The docs check SHALL fail and name any command file without the flag.

#### Scenario: Command is hidden but runnable
- **WHEN** a new session starts with the commands installed
- **THEN** no command description SHALL appear in `/context`, and typing `/jois-git:stage` SHALL still run it

#### Scenario: Flag is missing
- **WHEN** a command file under `toolkit/commands/` lacks the flag
- **THEN** the docs check SHALL fail and name the file

### Requirement: Installer works with no skills
The installer and the docs check SHALL work when `toolkit/skills/` is missing or empty, because the toolkit may ship only commands and rules. The helper that computes an item's content hash and version SHALL live under `toolkit/install/`, not inside a skill, so the installer does not depend on any skill.

#### Scenario: No skills folder
- **WHEN** the installer runs `-List` or an install and `toolkit/skills/` does not exist
- **THEN** it SHALL complete and install the commands and rules without error

#### Scenario: Hash helper is independent of skills
- **WHEN** `toolkit/skills/` is absent
- **THEN** the installer SHALL still find its hash helper at `toolkit/install/Get-ItemHash.ps1`
