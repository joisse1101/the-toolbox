## ADDED Requirements

### Requirement: Test mock data rule loads in every session
The toolkit SHALL provide a `jois-test-mock-data` rule at `toolkit/rules/jois-test-mock-data.md` with `metadata.version` and `metadata.last_updated` frontmatter and no `paths:` frontmatter, so it loads in every session and applies to verification steps that touch no code file (a `git push`, a deploy, a request to the user for data). It is exempt from the requirement that core rules be code-scoped. The rule SHALL require that testing and verification of a change use mock or fixture data and mock or stubbed systems by default. It SHALL forbid pushing, publishing, sending, deploying or writing to a real external system, and using real user data, credentials or state, to test or verify a change. It SHALL require that, when test data is needed, Claude first reuse existing fixtures and sample data and derive the data's shape from schemas, types, models and existing tests, then create mock data from that shape and test on it. It SHALL require that, only when the codebase does not give enough to build mock data, Claude asks the user for mock data or for the data's shape (schema or fields), and SHALL forbid asking the user for real data. It SHALL allow real data or a real system only when the user explicitly asks for it in the current request, and SHALL state that an earlier approval does not carry over. The rule SHALL extend, and not restate, the principle in `jois-code-core-principles` that tests never touch real user state.

#### Scenario: Verification defaults to mock data
- **WHEN** Claude needs to verify a change that reads or writes data
- **THEN** it SHALL use existing fixtures or mock data built from the codebase's schemas, types, models and tests, and SHALL NOT use real data

#### Scenario: No real external effect to verify
- **WHEN** Claude wants to see how a push, publish, send or deploy behaves
- **THEN** it SHALL use a mock or stub of that system and SHALL NOT perform the real action

#### Scenario: Codebase is not enough
- **WHEN** the codebase does not give enough to build mock data
- **THEN** Claude SHALL ask the user for mock data or for the shape of the data, and SHALL NOT ask for real data

#### Scenario: Explicit request allows real data
- **WHEN** the user explicitly asks in the current request to use real data or a real system
- **THEN** the rule SHALL allow it for that request only, and an approval given in an earlier request SHALL NOT carry over

#### Scenario: Rule loads without touching code
- **WHEN** a session never reads or creates a source-code file and then verifies a change
- **THEN** the rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-test-mock-data.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped rule
- **WHEN** the docs check runs and `jois-test-mock-data.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

#### Scenario: Installer delivers the rule
- **WHEN** the installer copies the toolkit's rules
- **THEN** `jois-test-mock-data.md` SHALL be installed alongside the other rules without any installer change
