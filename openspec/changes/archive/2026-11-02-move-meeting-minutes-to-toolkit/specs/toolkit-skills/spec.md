## MODIFIED Requirements

### Requirement: Jois command files are versioned
Each command file under `toolkit/commands/jois-git/`, `toolkit/commands/jois-init/`, `toolkit/commands/jois-code/` and `toolkit/commands/jois-docs/` SHALL declare `metadata.version` (semver) and `metadata.last_updated`
(a date) in its frontmatter, and the docs check SHALL fail and name a file where either is missing or
malformed.

#### Scenario: Missing version
- **WHEN** `toolkit/commands/jois-git/stage.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Setup command is checked too
- **WHEN** `toolkit/commands/jois-init/opsx.md` has no `metadata.last_updated`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Orchestrator command is checked too
- **WHEN** `toolkit/commands/jois-code/apply.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Docs command is checked too
- **WHEN** `toolkit/commands/jois-docs/meeting-minutes.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file
