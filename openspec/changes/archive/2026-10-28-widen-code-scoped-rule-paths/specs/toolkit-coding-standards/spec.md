## MODIFIED Requirements

### Requirement: Core floor is code-scoped
The jois-code-core-principles, jois-code-architecture-boundaries and jois-code-quality rules SHALL declare `paths:` frontmatter limited to source-code file types: `py`, `java`, `ts`, `tsx`, `js`, `jsx`, `ps1`, `sh`, `bat`, `html`, `css`, `scss`, `vue`, `svelte`, `go`, `rs`, `cs`, `kt`, `rb`, `php`, `c`, `h`, `cpp`, `swift` and `sql`. They load when code of those types is touched and not in sessions that never touch code, such as ticket or workflow work. All three rules SHALL declare exactly the same set of file types, so they load together. No size limit SHALL apply to them: a rule is written in clear prose, not compressed to fit a byte count.

#### Scenario: Core rules present
- **WHEN** the docs check runs
- **THEN** it SHALL fail if any of the three rules is missing

#### Scenario: Core rules are code-scoped
- **WHEN** the docs check runs
- **THEN** it SHALL fail if any of the three rules has no `paths:` frontmatter or a glob for a non-source-code file type such as `json`, `yaml` or `md`

#### Scenario: Size is not checked
- **WHEN** a rule file is large
- **THEN** the docs check SHALL NOT fail because of its size

#### Scenario: Web and other languages are covered
- **WHEN** a session touches an `.html`, `.css`, `.go` or `.sql` file
- **THEN** the three core rules SHALL be loaded, because those file types are in their scope

#### Scenario: The three rules share one scope
- **WHEN** one of the three rules lists a file type the others do not, or omits one they list
- **THEN** the docs check SHALL fail and name the rule and the file type
