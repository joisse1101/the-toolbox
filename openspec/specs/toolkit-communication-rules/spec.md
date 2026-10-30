# toolkit-communication-rules Specification

## Purpose

Gives Claude standing rules for how it writes: a short rule for chat replies that loads in every session, and a rule for markdown documents that loads only when a markdown file is touched.

## Requirements

### Requirement: Replies rule loads in every session
The toolkit SHALL provide a `jois-comms-replies` rule at `toolkit/rules/jois-comms-replies.md` with no `paths:` frontmatter, so it applies to every reply whatever files are touched. It SHALL carry the same `metadata.version` and `metadata.last_updated` header as the other rules. It SHALL stay short, because it loads on every turn.

#### Scenario: Rule loads without touching any file
- **WHEN** a session only answers questions and touches no file
- **THEN** the replies rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Rule is short
- **WHEN** the rule file is read
- **THEN** its body SHALL be about 10 lines, one idea per bullet

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-comms-replies.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped replies rule
- **WHEN** the docs check runs and `jois-comms-replies.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

### Requirement: Replies lead with the answer in plain words
The replies rule SHALL tell Claude to put the answer or result first and give detail only as needed. It SHALL tell Claude to keep paragraphs short and to keep each bullet to one idea in one short sentence. It SHALL tell Claude to use plain words, to define a technical term on first use or use a common word instead, and never to use a name or label it invented earlier in the session without saying what it stands for. It SHALL tell Claude to write for a reader who has only the current reply and no earlier context.

#### Scenario: Answer comes first
- **WHEN** Claude answers a question
- **THEN** the rule SHALL require the first sentence to hold the answer or result

#### Scenario: Coined label is explained
- **WHEN** Claude refers to a label it made up earlier in the session
- **THEN** the rule SHALL require the reply to say what the label stands for

#### Scenario: One idea per bullet
- **WHEN** Claude writes a bullet list in a reply
- **THEN** the rule SHALL require each bullet to hold one idea in one short sentence

### Requirement: Replies end with a next step or numbered questions
The replies rule SHALL tell Claude to end a reply with a numbered list of questions when it needs answers, set apart from the text above it. It SHALL tell Claude to write each question as a full question on its own line, ending with a question mark. It SHALL tell Claude never to place a question the user must answer inside a paragraph. It SHALL tell Claude to end a reply with one clear next step when it needs nothing from the user. It SHALL NOT require Claude to limit the number of options it presents or the number of questions it asks.

#### Scenario: Question is not hidden
- **WHEN** Claude needs one or more decisions from the user
- **THEN** the rule SHALL require the questions to close the reply as a list, apart from the text before it

#### Scenario: Questions are numbered
- **WHEN** a reply holds two or more questions
- **THEN** the rule SHALL require them to be numbered, so the user can answer by number

#### Scenario: Nothing is asked
- **WHEN** Claude needs nothing from the user
- **THEN** the rule SHALL require the reply to end with the one next step

#### Scenario: Options are not capped
- **WHEN** the replies rule is read
- **THEN** it SHALL NOT limit Claude to a fixed number of options

### Requirement: Explicit requests and project files take precedence
The replies rule SHALL say that a user's explicit request for more detail, and a project's own `CLAUDE.md`, take precedence over it.

#### Scenario: User asks for detail
- **WHEN** the user asks for the full reasoning or more detail
- **THEN** the rule SHALL allow a longer reply

### Requirement: Documents rule loads when markdown is touched
The toolkit SHALL provide a `jois-comms-documents` rule at `toolkit/rules/jois-comms-documents.md` with `paths:` frontmatter limited to `**/*.md`, so it loads when a markdown file is read or created and not in sessions that never touch markdown. It SHALL carry the same `metadata.version` and `metadata.last_updated` header as the other rules. It SHALL NOT have a size limit.

#### Scenario: Rule loads for markdown
- **WHEN** a session reads or creates a `.md` file
- **THEN** the documents rule SHALL be loaded

#### Scenario: Rule does not load otherwise
- **WHEN** a session touches no `.md` file
- **THEN** the documents rule SHALL NOT be loaded

#### Scenario: No extension clash
- **WHEN** the docs check compares the `paths:` globs of the rules that are not code-scoped or unscoped
- **THEN** the extension `md` SHALL appear in no rule other than the documents rule

### Requirement: Documents are organized
The documents rule SHALL tell Claude to give each topic of a markdown document its own header and to keep a clear hierarchy of headers. It SHALL tell Claude to keep each bullet to one idea in one short sentence, to move a second idea into its own bullet or a sub-list, and to define a technical term on first use. It SHALL tell Claude to put the purpose or the result of a document first. It SHALL tell Claude to name who owns a next step and by when. It SHALL tell Claude to mark what is known, what is assumed and what is unchecked. It SHALL apply to every markdown file Claude writes, including specs, READMEs, skills and rules.

#### Scenario: Several ideas in one bullet
- **WHEN** a bullet in a document Claude writes holds more than one idea
- **THEN** the rule SHALL require it to be split into separate bullets or a sub-list

#### Scenario: Topic without a header
- **WHEN** a document covers several topics
- **THEN** the rule SHALL require a header for each topic, nested by hierarchy

#### Scenario: Next step without an owner
- **WHEN** a document Claude writes lists a next step
- **THEN** the rule SHALL require it to name who owns it and by when

#### Scenario: Guess stated as fact
- **WHEN** a document states something Claude has not checked
- **THEN** the rule SHALL require it to be marked as assumed or unchecked, apart from what is known

#### Scenario: Skills and rules are included
- **WHEN** Claude writes or edits a skill or rule file
- **THEN** the documents rule SHALL apply to it as to any other markdown file

### Requirement: Docs check knows the unscoped rules
The docs check SHALL keep a list of the unscoped rules, and SHALL require each rule on the list to have no `paths:` frontmatter. The list SHALL contain `jois-git-commit-hygiene.md` and `jois-comms-replies.md`. A rule that is on neither the code-scoped list nor the unscoped list SHALL still be checked as a technology rule that needs `paths:`.

#### Scenario: Both unscoped rules are accepted
- **WHEN** the docs check runs and both unscoped rules have only a `metadata:` block
- **THEN** it SHALL report no problem for them

#### Scenario: Either unscoped rule gains paths
- **WHEN** the docs check runs and either unscoped rule has `paths:` frontmatter
- **THEN** it SHALL fail and name that file

### Requirement: Installer installs the communication rules unchanged
The installer SHALL install both communication rules with the other rules, with no change to its behavior, because it copies every `.md` file directly under `toolkit/rules/`.

#### Scenario: Both rules are copied
- **WHEN** the installer runs for the rules
- **THEN** `jois-comms-replies.md` and `jois-comms-documents.md` SHALL each be copied as one rule item

### Requirement: README lists the communication rules
`toolkit/README.md` SHALL list both communication rules. It SHALL say that two rules are unscoped, the commit rule and the replies rule, and SHALL say why the replies rule is short.

#### Scenario: README names the rules
- **WHEN** a reader opens the README's rules section
- **THEN** it SHALL name `jois-comms-replies` and `jois-comms-documents` and say when each loads

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
