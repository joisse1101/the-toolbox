# toolkit-write-issue Specification

## Purpose

Defines `/jois-git:write-issue`, the manual-only command that drafts a bug, feature or task issue from the team templates and creates it on GitHub or GitLab with the host's CLI after the user confirms.

## Requirements

### Requirement: Manual-only single-file command
The toolkit SHALL include the command `/jois-git:write-issue`, the single file
`toolkit/commands/jois-git/write-issue.md`. It SHALL declare `disable-model-invocation: true` and SHALL
carry its templates and rules inside the file, so it is complete when copied by hand.

#### Scenario: Not offered to the model
- **WHEN** a session lists its available skills and commands
- **THEN** `write-issue` SHALL NOT appear in the context and SHALL run only when the user invokes it by name

### Requirement: Host detection from the remote
The command SHALL read the URL of the `origin` remote and choose the CLI from it: `gh` for `github.com`,
`glab` for a host whose name contains `gitlab`. For any other host it SHALL ask the user once which
CLI applies. When the chosen CLI is not installed or not authenticated for that host, it SHALL say so
and stop before drafting a publish.

#### Scenario: GitHub remote
- **WHEN** `origin` is `https://github.com/acme/app.git`
- **THEN** the command SHALL use `gh`

#### Scenario: Self-hosted GitLab
- **WHEN** `origin` is `git@gitlab.example.com:team/app.git`
- **THEN** the command SHALL use `glab`

#### Scenario: Unrecognised host
- **WHEN** `origin` is `https://git.example.com/team/app.git`
- **THEN** the command SHALL ask the user whether to use `gh` or `glab` and SHALL NOT guess

#### Scenario: CLI missing
- **WHEN** the chosen CLI is not on the PATH
- **THEN** the command SHALL name the missing CLI and create nothing

### Requirement: Issue type selects the template
The command SHALL choose one of three types, bug, feature or task, from the user's description, SHALL
state its choice, and SHALL ask only when the description fits more than one type.

#### Scenario: Type inferred
- **WHEN** the user describes a crash with steps that trigger it
- **THEN** the command SHALL state that it is drafting a bug issue and use the bug template

#### Scenario: Ambiguous description
- **WHEN** the description could be a feature or a task
- **THEN** the command SHALL ask which one before drafting

### Requirement: Bug template
A bug issue SHALL have the sections Summary, Steps to Reproduce, Expected Behavior and Actual Behavior,
and optionally Screenshots / Logs and Environment (OS, Browser, Version).

#### Scenario: Bug sections
- **WHEN** a bug issue is drafted with logs and no environment details
- **THEN** it SHALL have the four required sections and Screenshots / Logs, and no Environment section

### Requirement: Feature template
A feature issue SHALL have the sections Summary, Motivation, Proposed Solution, Alternatives
Considered and Acceptance Criteria, and optionally Design / Visuals and Technical Considerations /
Security.

#### Scenario: Feature sections
- **WHEN** a feature issue is drafted with a breaking API change noted and no design links
- **THEN** it SHALL have the five required sections and Technical Considerations / Security, and no Design / Visuals section

### Requirement: Task template
A task issue SHALL have the sections Summary, Background / Context, Scope and Definition of Done, and
optionally Testing & Verification and Dependencies / Blockers.

#### Scenario: Task sections
- **WHEN** a task issue is drafted that names a prerequisite PR and gives no test plan
- **THEN** it SHALL have the four required sections and Dependencies / Blockers, and no Testing & Verification section

### Requirement: Repository template takes precedence
When the repository holds an issue template for the chosen type (under `.github/ISSUE_TEMPLATE/` or
`.gitlab/issue_templates/`), the command SHALL use that template's sections instead of the toolkit's
and SHALL say which template it used. Otherwise it SHALL use the toolkit's template.

#### Scenario: Repo template present
- **WHEN** `.github/ISSUE_TEMPLATE/bug_report.md` exists and the type is bug
- **THEN** the draft SHALL follow that file's sections and the command SHALL name the file

#### Scenario: No repo template
- **WHEN** the repository has no issue template for the type
- **THEN** the draft SHALL follow the toolkit's template

### Requirement: Optional sections are omitted when empty
The command SHALL leave out an optional section, heading included, when neither the user nor the
conversation supplies content for it. It SHALL NOT write placeholder text such as "N/A" or "TBD" and
SHALL NOT invent content for any section. Within Environment it SHALL list only the entries that have
a value.

#### Scenario: Nothing for an optional section
- **WHEN** the user gives no design links for a feature
- **THEN** the issue body SHALL contain no Design / Visuals heading

#### Scenario: Partial environment
- **WHEN** a bug report has an OS and a version but no browser
- **THEN** the Environment section SHALL list the OS and the version and no browser line

### Requirement: Missing required content is asked for once
When a required section has no content, the command SHALL ask the user once for every missing required
section together, in plain text, and end its turn. It SHALL NOT fill a required section with a
placeholder or with content the user did not provide.

#### Scenario: Several gaps
- **WHEN** a bug description lacks steps to reproduce and expected behavior
- **THEN** the command SHALL ask for both in one message and create nothing

### Requirement: Secret scan before presenting
Before showing the draft, the command SHALL scan its text, the Screenshots / Logs content above all,
for secrets and credentials such as tokens, private keys, passwords and `.env` contents. It SHALL block
the draft and name the line when it finds one, and SHALL ask the user to supply a redacted version.

#### Scenario: Token in a log
- **WHEN** the pasted log contains an API token
- **THEN** the command SHALL NOT present the draft for confirmation and SHALL name the offending line

### Requirement: Duplicate search before creating
Before presenting, the command SHALL search the repository's open issues for the draft's key terms
with the host CLI and list any matches with number, title and link. When there are matches it SHALL
ask the user whether to continue before presenting the draft for confirmation.

#### Scenario: Similar open issue
- **WHEN** an open issue has a title matching the draft's summary
- **THEN** the command SHALL list it and ask whether to continue

#### Scenario: No match
- **WHEN** the search returns nothing
- **THEN** the command SHALL go on to present the draft

### Requirement: Confirmation word before publishing
The command SHALL show the issue type, repository, title and body, and name a confirmation word, then
end its turn. It SHALL create the issue only when the user's next message is that word. A different
reply SHALL NOT create the issue; after a change request the command SHALL revise, present again and
name a new word. The word SHALL differ from the one in its previous prompt.

#### Scenario: Word typed
- **WHEN** the user replies with the confirmation word from the latest prompt
- **THEN** the command SHALL create the issue and report its number and URL

#### Scenario: Approval without the word
- **WHEN** the user replies "looks good"
- **THEN** the command SHALL NOT create the issue and SHALL restate the word

#### Scenario: Change requested
- **WHEN** the user asks to reword the summary instead of confirming
- **THEN** the command SHALL revise, present again with a different word and create nothing

### Requirement: Body passed from a file
The command SHALL write the issue body to a temporary file outside the repository with the
file-writing tool and SHALL pass it to the host CLI from that file. It SHALL NOT put the body inline
in a shell command.

#### Scenario: Body with shell metacharacters
- **WHEN** the body contains backticks, quotes and a `$` sign
- **THEN** the issue created SHALL hold the body exactly as it was shown for confirmation

### Requirement: Create only
The command SHALL only create issues. It SHALL NOT close, edit, label, assign or comment on an issue,
and SHALL NOT set a milestone. Its permitted shell commands SHALL be limited to reading the remote,
searching and listing issues, and creating one.

#### Scenario: Close requested
- **WHEN** the user asks the command to close a duplicate
- **THEN** the command SHALL decline and leave the issue as it is

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
