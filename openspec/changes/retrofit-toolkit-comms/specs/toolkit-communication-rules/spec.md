## ADDED Requirements

### Requirement: Toolkit markdown follows the documents rule
The toolkit's own markdown files (`toolkit/rules/`, `toolkit/commands/`, `toolkit/agents/` and `toolkit/README.md`) SHALL follow `jois-comms-documents.md`: purpose or result first, a header per topic nested by hierarchy, one idea per bullet in one short sentence, technical terms defined on first use, an owner and a date on each next step, and what is known, assumed and unchecked kept apart. Each file that changes SHALL have its `metadata.version` and `metadata.last_updated` updated where it has them.

#### Scenario: Instruction files are structured
- **WHEN** a rule, command or agent file is read
- **THEN** it SHALL open with its purpose and use a header for each topic
- **AND** each bullet SHALL hold one idea

#### Scenario: Changed file carries a new version
- **WHEN** a rule, command or agent file with a `metadata` header is rewritten
- **THEN** its `metadata.version` SHALL increase and its `metadata.last_updated` SHALL be the date of the change

### Requirement: A retrofit changes no behavior
A rewrite that brings existing toolkit files in line with the communication rules SHALL change structure and wording only. It SHALL NOT add, remove or weaken a step, a hard stop, a confirmation-word requirement, a path scope or a normative rule in the file it rewrites.

#### Scenario: Hard stops survive a rewrite
- **WHEN** a command that ends its turn for a confirmation word is rewritten
- **THEN** the rewritten command SHALL still end its turn and name a confirmation word at the same points

#### Scenario: Docs check and tests still pass
- **WHEN** a retrofit PR is ready for review
- **THEN** `python check_toolkit.py` and `python -m pytest` run from `toolkit/` SHALL pass
