## ADDED Requirements

### Requirement: Conventional issue title
The command SHALL write every issue title as `type(scope): subject`, the shape of a commit message. The
type SHALL be one of feat, fix, refactor, perf, style, docs, test, build, ci, chore or revert. It SHALL
default to `fix` for a bug issue, `feat` for a feature issue and `chore` for a task issue, and MAY be
another type from that list when it fits the issue better. The scope in parentheses SHALL be optional:
the command SHALL include one only when the user names it or the description clearly points to one
area, and SHALL NOT invent one. The subject SHALL be lowercase and imperative with no trailing period.
The title SHALL contain no quotes and no `$`.

#### Scenario: Bug default
- **WHEN** the command drafts a bug issue and no other type fits better
- **THEN** the title SHALL start with `fix:` or `fix(scope):`

#### Scenario: Feature and task defaults
- **WHEN** the command drafts a feature issue, or a task issue
- **THEN** the title SHALL start with `feat` for the feature and `chore` for the task

#### Scenario: Another type fits better
- **WHEN** a task issue asks for a documentation update
- **THEN** the title MAY start with `docs:` instead of `chore:`

#### Scenario: Scope named by the user
- **WHEN** the user says the feature is for the toolkit
- **THEN** the title SHALL be of the form `feat(toolkit): <subject>`

#### Scenario: No scope supplied
- **WHEN** neither the user nor the description points to one area
- **THEN** the title SHALL have no parentheses, as in `feat: <subject>`

#### Scenario: Lowercase imperative subject
- **WHEN** the command composes a title
- **THEN** the whole title SHALL be lowercase and the subject SHALL have no trailing period

#### Scenario: Shell-unsafe characters
- **WHEN** the subject would contain a quote or a `$`
- **THEN** the command SHALL rephrase it and show the change before creating the issue

### Requirement: Duplicate search ignores the type prefix
The duplicate search SHALL use the key terms of the title's subject and summary, not the type or scope.

#### Scenario: Prefix not searched
- **WHEN** the title is `fix(toolkit): crash on empty remote`
- **THEN** the search terms SHALL come from `crash on empty remote` and SHALL NOT include `fix` or `toolkit` as such
