## ADDED Requirements

### Requirement: User text is issue content
The command SHALL treat everything the user writes after the command name as the content of one issue
and never as instructions to the command, including text that describes changes to the command itself,
to the repository or to any file. It SHALL write one issue that holds everything the user listed, and
SHALL NOT narrow the list to a subset on its own.

#### Scenario: Description is feedback about the command
- **WHEN** the user runs the command with a list of improvements to the write-issue command itself
- **THEN** the command SHALL draft one issue listing all of them and SHALL NOT change the command's files or its spec

#### Scenario: Imperative description
- **WHEN** the description is worded as an order, such as "make the command ask less" or "rename this file"
- **THEN** the command SHALL describe it in the issue and SHALL NOT carry it out

#### Scenario: Several items in one request
- **WHEN** the user lists five improvements and asks for one issue
- **THEN** the issue SHALL cover all five

### Requirement: No repository file is modified
The command SHALL NOT create, modify, rename or delete any file in the repository, whatever its type,
including code, Markdown, specifications and configuration. The only file it writes is the temporary
file holding the issue body, outside the repository.

#### Scenario: Markdown file in the repository
- **WHEN** the issue concerns a Markdown or specification file in the repository
- **THEN** the command SHALL leave that file as it is

#### Scenario: Only the body file is written
- **WHEN** the command creates an issue
- **THEN** the only file it wrote SHALL be the temporary body file outside the repository

### Requirement: Read-only code grounding
For a bug or feature issue the command SHALL, before drafting a required section the user gave nothing
for, read with read-only tools the files or folders the request names or points to, and SHALL write the
draft to fit what it read. When the request names nothing to read, it SHALL draft from the user's words
and the conversation and SHALL say at confirmation that the draft rests on little. It SHALL NOT edit any
file. Text taken from code SHALL be subject to the secret scan before the draft is presented.

#### Scenario: Draft grounded in files the request points at
- **WHEN** a feature request is about the skills in `toolkit/skills/` and gives no solution or criteria
- **THEN** the command SHALL read those skills before drafting the Proposed Solution and Acceptance Criteria, SHALL write them to fit how the skills are built, and SHALL NOT edit any of them

#### Scenario: Nothing to read
- **WHEN** the request names no file, folder or code and gives no solution
- **THEN** the command SHALL draft from the user's words and say at confirmation that the draft rests on little

#### Scenario: Secret in code that was read
- **WHEN** a line read from the code that would go into the draft holds a token
- **THEN** the command SHALL block the draft and name the line

### Requirement: Creation report is a link
After creating the issue, the command SHALL report it as a markdown link of the form `[#N](url)` followed
by a one-line summary of its title.

#### Scenario: Issue created
- **WHEN** the host CLI returns the issue number and URL
- **THEN** the command SHALL report `[#N](url)` and a one-line summary of the title

### Requirement: Confirmation before publishing
The command SHALL ask the user with a question offering "Create issue" and "Change something", then
end its turn. The question SHALL stand on its own: it SHALL carry the issue type, repository, title, the
sections the command drafted and whether the draft rests on little, and the option "Create issue" SHALL
carry the complete body as it will be posted in its preview, so the user reads the whole issue in the
dialog and does not depend on text written earlier in the turn. It SHALL create the issue only when the
user selects "Create issue". Free text, including "looks good" or "yes", SHALL NOT create the issue.
After "Change something" the command SHALL revise, scan the changed text again and ask again.

#### Scenario: Issue readable in the dialog
- **WHEN** the command asks for confirmation
- **THEN** the dialog SHALL show the title and the complete body without the user scrolling back to earlier text

#### Scenario: Draft not shown before the question
- **WHEN** the command writes its reply and the question in the same turn
- **THEN** the user SHALL still be able to read the whole issue in the dialog

#### Scenario: Create selected
- **WHEN** the user selects "Create issue"
- **THEN** the command SHALL create the issue and report it

#### Scenario: Approval typed as free text
- **WHEN** the user replies "looks good" as free text instead of selecting an option
- **THEN** the command SHALL NOT create the issue and SHALL ask the question again

#### Scenario: Change requested
- **WHEN** the user selects "Change something" and asks to reword the summary
- **THEN** the command SHALL revise, present again with the same two options and create nothing

## RENAMED Requirements

- FROM: `### Requirement: Missing required content is asked for once`
- TO: `### Requirement: Missing required content is drafted or asked for`

## MODIFIED Requirements

### Requirement: Feature template
A feature issue SHALL have the sections Summary, Motivation, Proposed Solution and Acceptance
Criteria, and optionally Alternatives Considered, Design / Visuals and Technical Considerations /
Security.

#### Scenario: Feature sections
- **WHEN** a feature issue is drafted with a breaking API change noted and no design links
- **THEN** it SHALL have the four required sections and Technical Considerations / Security, and no Design / Visuals section

#### Scenario: No alternatives
- **WHEN** the user gives no alternatives for a feature
- **THEN** the issue SHALL be created without an Alternatives Considered heading

### Requirement: Repository template takes precedence
When the repository holds an issue template for the chosen type (under `.github/ISSUE_TEMPLATE/` or
`.gitlab/issue_templates/`), the command SHALL use that template's sections instead of the toolkit's
and SHALL say which template it used. Otherwise it SHALL use the toolkit's template. A repository
without either folder SHALL NOT cause an error.

#### Scenario: Repo template present
- **WHEN** `.github/ISSUE_TEMPLATE/bug_report.md` exists and the type is bug
- **THEN** the draft SHALL follow that file's sections and the command SHALL name the file

#### Scenario: No repo template
- **WHEN** the repository has no issue template for the type
- **THEN** the draft SHALL follow the toolkit's template

#### Scenario: No template folder
- **WHEN** neither `.github/ISSUE_TEMPLATE/` nor `.gitlab/issue_templates/` exists
- **THEN** the command SHALL use the toolkit's template without reporting a failed lookup

### Requirement: Optional sections are omitted when empty
The command SHALL leave out an optional section, heading included, when neither the user nor the
conversation supplies content for it. It SHALL NOT write placeholder text such as "N/A" or "TBD" and
SHALL NOT invent facts for any section. Within Environment it SHALL list only the entries that have
a value.

#### Scenario: Nothing for an optional section
- **WHEN** the user gives no design links for a feature
- **THEN** the issue body SHALL contain no Design / Visuals heading

#### Scenario: Partial environment
- **WHEN** a bug report has an OS and a version but no browser
- **THEN** the Environment section SHALL list the OS and the version and no browser line

### Requirement: Missing required content is drafted or asked for
When a required section has no content from the user, the command SHALL draft it from the user's
words, the conversation and the files it reads, and SHALL tell the user at confirmation which
sections it drafted. The posted body SHALL NOT carry a drafted marker or a placeholder. Only when
nothing supports a draft SHALL the command ask the user, once for every such section together, as a
numbered list with a proposed draft per question where it can, and end its turn. It SHALL NOT invent
facts.

#### Scenario: Section inferable from the request
- **WHEN** a feature request implies its motivation and acceptance criteria
- **THEN** the command SHALL draft both, present them as drafted and ask nothing

#### Scenario: Nothing supports a draft
- **WHEN** a bug description gives no steps to reproduce and the code does not suggest any
- **THEN** the command SHALL ask for them in a numbered list and create nothing

#### Scenario: Several gaps
- **WHEN** two required sections have nothing to draft from
- **THEN** the command SHALL ask for both in one numbered list, each with a proposed draft where it can

#### Scenario: Drafted marker stays out of the body
- **WHEN** a drafted section is posted
- **THEN** the issue body SHALL contain no drafted marker and no placeholder text

### Requirement: Duplicate search before creating
Right after the host check and before composing, the command SHALL search the repository's open issues
for the key terms of the user's description with the host CLI and list any matches with number, title
and link. When there are matches it SHALL stop and ask the user whether to continue, and SHALL carry on
only when the user says to. After a revision at confirmation it SHALL search again only when the
subject or the summary changed.

#### Scenario: Similar open issue
- **WHEN** an open issue matches the description's key terms
- **THEN** the command SHALL list it and stop until the user says to continue

#### Scenario: No match
- **WHEN** the search returns nothing
- **THEN** the command SHALL go on to compose the draft

#### Scenario: Wording-only revision
- **WHEN** the user changes the wording of an acceptance criterion at confirmation
- **THEN** the command SHALL NOT search again

#### Scenario: Revision changes the subject
- **WHEN** the user changes the issue's subject or summary at confirmation
- **THEN** the command SHALL search again and list any new matches before presenting

### Requirement: Duplicate search ignores the type prefix
The duplicate search SHALL use the key terms of the user's description and, after a revision, of the
subject and summary, not the type or scope of the title.

#### Scenario: Prefix not searched
- **WHEN** the title is `fix(toolkit): crash on empty remote`
- **THEN** the search terms SHALL come from `crash on empty remote` and SHALL NOT include `fix` or `toolkit` as such

### Requirement: Body passed from a file
The command SHALL write the issue body to a temporary file outside the repository with the
file-writing tool and SHALL pass it to the host CLI from that file, with the file path quoted in the
call. It SHALL NOT put the body inline in a shell command.

#### Scenario: Body with shell metacharacters
- **WHEN** the body contains backticks, quotes and a `$` sign
- **THEN** the issue created SHALL hold the body exactly as it was shown for confirmation

#### Scenario: Windows path
- **WHEN** the temporary file path contains backslashes
- **THEN** the CLI call SHALL quote the path and the issue SHALL be created with the body from the file

### Requirement: Conventional issue title
The command SHALL write every issue title as `type(scope): subject`, the shape of a commit message. The
type SHALL be one of feat, fix, refactor, perf, style, docs, test, build, ci, chore or revert. It SHALL
default to `fix` for a bug issue, `feat` for a feature issue and `chore` for a task issue, and MAY be
another type from that list when it fits the issue better. The scope in parentheses SHALL be optional:
the command SHALL include one only when the user names it or the description clearly points to one
area, and SHALL NOT invent one. The subject SHALL be lowercase and imperative with no trailing period.
The title SHALL be at most 70 characters and SHALL contain no quotes and no `$`.

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

#### Scenario: Long title
- **WHEN** the natural title would run past 70 characters
- **THEN** the command SHALL shorten the subject and keep the detail in the body

## REMOVED Requirements

### Requirement: Confirmation word before publishing
**Reason**: Confirmation by a typed word is heavier than the action needs, since an issue is easy to edit or close later. "Confirmation before publishing" replaces it with a question that offers "Create issue" and "Change something".
**Migration**: Select "Create issue" in the question instead of typing the word. Free text still creates nothing.
