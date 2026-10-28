## MODIFIED Requirements

### Requirement: Layered standards
The toolkit SHALL provide its coding standards as separate files, not one document: a jois-code-core-principles rule, a jois-code-architecture-boundaries rule, a jois-code-quality rule, and one rule per technology (TypeScript/React, Java, Python, configuration files, scripts). The toolkit SHALL NOT ship a coding-standards skill; standards are rules that load while code is written. No file SHALL duplicate another's guidance; a rule SHALL link to the layer that owns a topic instead of restating it.

#### Scenario: Each layer exists as its own file
- **WHEN** a reader lists `toolkit/rules/`
- **THEN** they SHALL find jois-code-core-principles, jois-code-architecture-boundaries, jois-code-quality, jois-code-typescript-react, jois-code-java, jois-code-python, jois-code-config-files and jois-code-scripts rules, each as a separate file, and `toolkit/skills/` SHALL NOT contain `jois-code-standards`

#### Scenario: Topic has one owner
- **WHEN** a principle such as fail-fast error handling is covered by the core rule
- **THEN** language rules and the jois-code-quality rule SHALL add only their own mechanics for it and SHALL NOT restate the principle

### Requirement: Rules are separated from style
A guideline SHALL be written as a rule ("must" or "never") only if breaking it causes a defect, a security hole, structural damage or code a person cannot readily read. A guideline that only affects consistency or taste is style and SHALL be written as a preference ("prefer"). Readability is a rule, not style, but only for the concrete smells the jois-code-quality rule lists (cryptic names, nested ternaries, dense one-liners that need decoding, functions doing several jobs, comments that restate the code); general judgments such as "feels dense" remain preferences. The jois-code-core-principles and jois-code-architecture-boundaries rules SHALL contain rules only. The jois-code-quality rule and the technology rules MAY carry style, but only in a final "Prefer" section kept separate from their rules. Style that a linter or formatter enforces SHALL NOT appear in any file.

#### Scenario: Core files hold no style
- **WHEN** jois-code-core-principles or jois-code-architecture-boundaries is read
- **THEN** every line SHALL be a rule, and no line SHALL be a naming, formatting or layout preference

#### Scenario: Technology style is segregated
- **WHEN** the jois-code-quality rule or a technology rule contains preferences
- **THEN** they SHALL appear under a "Prefer" heading after all rules

#### Scenario: Readability smells are rules
- **WHEN** the jois-code-quality rule lists a concrete readability smell such as a nested ternary
- **THEN** it SHALL appear among the rules and not under "Prefer"

#### Scenario: Subjective readability stays a preference
- **WHEN** a readability judgment has no concrete check, such as "this feels dense"
- **THEN** it SHALL appear only under "Prefer"

## REMOVED Requirements

### Requirement: Review skill is on demand and self-contained
**Reason**: Coding standards should be loaded while code is written, not fetched on demand for a review. The built-in code-review and simplify skills cover review.
**Migration**: The standards it held move into the `jois-code-quality` rule; remove `~/.claude/skills/jois-code-standards` and reinstall the toolkit.

### Requirement: Core floor is small and code-scoped
**Reason**: Renamed and reworded: the size limits are removed and the quality rule joins the set.
**Migration**: Replaced by the requirement of the same subject added below.

### Requirement: Technology rules are path-scoped
**Reason**: Reworded to drop the size limit; a MODIFIED requirement cannot drop its "Rule over budget" scenario.
**Migration**: Replaced by the requirement of the same subject added below.

### Requirement: Commit hygiene rule is unscoped
**Reason**: Reworded to drop the size limit; a MODIFIED requirement cannot drop its "Rule over budget" scenario.
**Migration**: Replaced by the requirement of the same subject added below.

### Requirement: Dependency hygiene in the configuration rule
**Reason**: Reworded to drop the size limit; a MODIFIED requirement cannot drop its "Rule over budget" scenario.
**Migration**: Replaced by the requirement of the same subject added below.

## ADDED Requirements

### Requirement: Core floor is code-scoped
The jois-code-core-principles, jois-code-architecture-boundaries and jois-code-quality rules SHALL declare `paths:` frontmatter limited to source-code file types (`py`, `java`, `ts`, `tsx`, `js`, `jsx`, `ps1`, `sh`, `bat`), so they load when code is touched and not in sessions that never touch code, such as ticket or workflow work. No size limit SHALL apply to them: a rule is written in clear prose, not compressed to fit a byte count.

#### Scenario: Core rules present
- **WHEN** the docs check runs
- **THEN** it SHALL fail if any of the three rules is missing

#### Scenario: Core rules are code-scoped
- **WHEN** the docs check runs
- **THEN** it SHALL fail if any of the three rules has no `paths:` frontmatter or a glob for a non-source-code file type such as `json`, `yaml` or `md`

#### Scenario: Size is not checked
- **WHEN** a rule file is large
- **THEN** the docs check SHALL NOT fail because of its size

### Requirement: Technology rules are scoped by file type
Each technology rule SHALL declare `paths:` frontmatter matching only its own file types, so it loads when files of that type are in play and not otherwise: TypeScript/React for `ts`, `tsx`, `js`, `jsx`, `css` and `html`; Java for `java`; Python for `py`; configuration for `yml`, `yaml`, `json` and `toml`; scripts for `ps1`, `sh` and `bat`. The code-scoped core rules are exempt from the one-rule-per-extension check, since they apply to every code type.

#### Scenario: TypeScript/React rules and preferences
- **WHEN** the TypeScript/React rule is read
- **THEN** it SHALL require calling the backend only through a single API client wrapper, and design tokens for colors, colocated component styles, single-source breakpoints and size-independent data in views SHALL appear only under its "Prefer" heading

#### Scenario: Patterns do not overlap
- **WHEN** the `paths:` globs of all technology rules are compared
- **THEN** no file extension SHALL appear in more than one technology rule

### Requirement: Commit hygiene rule loads in every session
The toolkit SHALL provide a `jois-git-commit-hygiene` rule at `toolkit/rules/jois-git-commit-hygiene.md` with no `paths:` frontmatter, so it loads in every session whatever file types are touched, and so it applies to commits that contain no source code (generated images, deletions, renames, documentation). The rule SHALL be worded to apply only when a commit is about to be made. It is exempt from the requirement that core rules be code-scoped.

#### Scenario: Rule loads without touching code
- **WHEN** a session creates a binary asset or deletes files and then prepares a commit
- **THEN** the jois-git-commit-hygiene rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Rule is inert without a commit
- **WHEN** a session never prepares a commit, or runs outside a git repository
- **THEN** the rule SHALL require nothing of it

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-git-commit-hygiene.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped commit rule
- **WHEN** the docs check runs and `jois-git-commit-hygiene.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

### Requirement: Configuration rule covers dependency hygiene
The configuration rule SHALL require that lockfiles are committed and regenerated with the tool, never hand-edited; that shared packages use no wildcard or floating dependency versions; and that dependencies between packages in the same workspace are declared through the workspace mechanism and not by copying code or by relative path. The rule's `paths:` frontmatter SHALL remain limited to `yml`, `yaml`, `json` and `toml`.

#### Scenario: Dependency lines present
- **WHEN** the configuration rule is read
- **THEN** it SHALL state that lockfiles are committed, that shared packages avoid wildcard or floating versions, and that workspace dependencies use the workspace mechanism

#### Scenario: Scope unchanged
- **WHEN** the `paths:` globs of all technology rules are compared
- **THEN** the configuration rule SHALL still match only `yml`, `yaml`, `json` and `toml`, and no extension SHALL appear in more than one technology rule

### Requirement: Code quality rule
The toolkit SHALL provide a `jois-code-quality` rule, scoped as the other code-scoped rules, that states the standards `jois-code-core-principles` does not: no dead or commented-out code; no more than about two levels of nesting (early returns or an extracted function); named constants for unexplained literals; no nested ternaries; no dense one-liner that needs decoding; comments that explain why, not what; and testing structure (one behavior per test, arrange-act-assert, names that say what happens and when, testing through the public interface, one test file per module following the project's convention, and a bug fix shipped with a test that fails without it). It SHALL link to jois-code-core-principles for DRY, YAGNI, error handling, descriptive names and one job per function instead of restating them. Its consistency-only guidance (matching surrounding code, naming conventions for values, functions and booleans, documenting public APIs by contract) SHALL appear only under a final "Prefer" heading. It SHALL NOT reference any rule, skill or file that is not in the toolkit and SHALL NOT carry technology-specific content owned by the technology rules.

#### Scenario: Rule loads while coding
- **WHEN** a session touches a source-code file
- **THEN** the jois-code-quality rule SHALL be loaded without the user asking for it

#### Scenario: No duplicate guidance
- **WHEN** the rule is read
- **THEN** it SHALL NOT restate DRY, YAGNI, swallowed-error handling or the read-by-a-person-first principle, and SHALL link to jois-code-core-principles for them

#### Scenario: No dangling references
- **WHEN** the rule's references to other rules and files are checked
- **THEN** every one SHALL resolve to an item in `toolkit/`

#### Scenario: Style is last
- **WHEN** the rule contains consistency-only guidance such as naming conventions
- **THEN** it SHALL appear under "Prefer" after all rules
