# Spec Delta

## MODIFIED Requirements

### Requirement: Toolkit markdown follows the documents rule
The toolkit's own markdown files (`toolkit/rules/`, `toolkit/commands/`, `toolkit/agents/`, `toolkit/README.md` and the toolkit pages under `wiki/`) SHALL follow `jois-comms-documents.md`: purpose or result first, a header per topic nested by hierarchy, bullets only for parallel items, one idea per remaining bullet in one short sentence, technical terms defined on first use, an owner and a date on each next step, and what is known, assumed and unchecked kept apart. A file written before the bullet rules were added SHALL be brought in line when it is next edited, and not before. Each file that changes SHALL have its `metadata.version` and `metadata.last_updated` updated where it has them.

#### Scenario: Instruction files are structured
- **WHEN** a rule, command or agent file is read
- **THEN** it SHALL open with its purpose and use a header for each topic
- **AND** each bullet that remains after the bullet test SHALL hold one idea

#### Scenario: Changed file carries a new version
- **WHEN** a rule, command or agent file with a `metadata` header is rewritten
- **THEN** its `metadata.version` SHALL increase and its `metadata.last_updated` SHALL be the date of the change

#### Scenario: Older file is not rewritten early
- **WHEN** a toolkit file was written before the bullet rules were added and is not otherwise being edited
- **THEN** it SHALL NOT be required to change

## REMOVED Requirements

### Requirement: README lists the communication rules
**Reason**: The README becomes a quick start and the full rules list moves to the toolkit wiki.
**Migration**: The same content is required of the wiki by the `project-wiki` requirement "Wiki lists the communication rules".
