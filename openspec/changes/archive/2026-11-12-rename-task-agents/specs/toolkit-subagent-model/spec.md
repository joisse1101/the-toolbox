## MODIFIED Requirements

### Requirement: Toolkit agents pin their model
`task-applier` and `code-validator` SHALL declare `model: sonnet` in their frontmatter, and `test-runner` SHALL keep `model: haiku`. Each changed agent SHALL have its `metadata.version` and `metadata.last_updated` updated.

#### Scenario: Pinned agents
- **WHEN** the files under `toolkit/agents/` are read
- **THEN** `task-applier.md` and `code-validator.md` SHALL declare `sonnet`, `test-runner.md` SHALL declare `haiku` and `jois-worker.md` SHALL declare `sonnet`
