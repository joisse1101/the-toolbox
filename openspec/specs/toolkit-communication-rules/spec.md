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
- **THEN** its body SHALL be about 20 lines, one idea per bullet

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-comms-replies.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped replies rule
- **WHEN** the docs check runs and `jois-comms-replies.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

### Requirement: Replies are understandable from the conversation alone
The replies rule SHALL state the principle that anyone should be able to follow the conversation by reading only the conversation, and that failing this means there is too much jargon. It SHALL tell Claude to use a term only when the conversation or an artifact it can point to (a glossary page, a wiki page or a code comment) defines it, and otherwise to explain the term in a short phrase of plain English the first time. It SHALL say this includes any name Claude coined earlier.

#### Scenario: Term defined in an artifact
- **WHEN** a glossary page or defining code comment exists for a term
- **THEN** the rule SHALL allow Claude to use the term and point to that artifact

#### Scenario: Term defined nowhere
- **WHEN** Claude needs a term that neither the conversation nor any artifact defines
- **THEN** the rule SHALL require a short plain-English explanation on first use

#### Scenario: Coined label is explained
- **WHEN** Claude refers to a label it made up earlier in the session
- **THEN** the rule SHALL require the reply to say what the label stands for

### Requirement: Replies have a clear shape
The replies rule SHALL tell Claude to put the answer or result first and give detail only as needed. It SHALL tell Claude that a long reply has three parts in order: what was done, why it was done (including any exceptions and how they were resolved), and what comes next. It SHALL tell Claude to keep paragraphs short and each bullet to one idea.

#### Scenario: Answer comes first
- **WHEN** Claude answers a question
- **THEN** the rule SHALL require the first sentence to hold the answer or result

#### Scenario: Long reply has three parts
- **WHEN** a long explanatory reply is needed
- **THEN** the rule SHALL require a summary of what was done, then the reasoning with exceptions and their resolution, then next steps, questions or calls to action

#### Scenario: One idea per bullet
- **WHEN** Claude writes a bullet list in a reply
- **THEN** the rule SHALL require each bullet to hold one idea

### Requirement: Claude decides by default and asks in three cases
The replies rule SHALL tell Claude to decide for itself using a sensible default, to say what it chose and why, and to stand by the choice. It SHALL tell Claude to ask only when at least one of three conditions holds: the answer is the user's preference and nothing in the code, docs or conversation favours one option; Claude looked and cannot find the answer; or a wrong guess is hard to undo or reaches outside the repo.

#### Scenario: Default is used and stated
- **WHEN** a sensible default exists for a decision
- **THEN** the rule SHALL require Claude to act on it and say what it chose and why, without asking

#### Scenario: Preference with no favoured option
- **WHEN** the choice is the user's preference and nothing favours one option
- **THEN** the rule SHALL allow Claude to ask

#### Scenario: Hard to undo
- **WHEN** a wrong guess is hard to undo or reaches outside the repo
- **THEN** the rule SHALL allow Claude to ask

### Requirement: Questions are easy to answer
The replies rule SHALL tell Claude, when it must ask, to use the AskUserQuestion tool where available with options and its recommended option marked, and otherwise to end the reply with a plain question. It SHALL tell Claude to write one question as a plain sentence and to number several independent questions so the user can reply by number. It SHALL tell Claude to write alternatives for one decision as options inside a single question. It SHALL tell Claude to end a reply with one clear next step when it needs nothing from the user. It SHALL NOT limit the number of options or questions.

#### Scenario: Recommended option is marked
- **WHEN** Claude asks through AskUserQuestion
- **THEN** the rule SHALL require the options to include its recommendation, marked as such

#### Scenario: One question is not numbered
- **WHEN** a reply holds exactly one question
- **THEN** the rule SHALL require it to be a plain sentence, not a numbered item

#### Scenario: Questions are numbered
- **WHEN** a reply holds two or more independent questions
- **THEN** the rule SHALL require them to be numbered, so the user can answer by number

#### Scenario: Alternatives stay in one question
- **WHEN** Claude offers alternatives for one decision
- **THEN** the rule SHALL require them to appear as options inside one question

#### Scenario: Nothing is asked
- **WHEN** Claude needs nothing from the user
- **THEN** the rule SHALL require the reply to end with one next step

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
The documents rule SHALL tell Claude to give each topic of a markdown document its own header and to keep a clear hierarchy of headers. It SHALL tell Claude to keep each bullet to one idea in one short sentence, to move a second idea into its own bullet or a sub-list, and to define a technical term on first use unless the repository has a glossary or definitions page, in which case Claude SHALL link to it. It SHALL tell Claude to put the purpose or the result of a document first. It SHALL tell Claude to name who owns a next step and by when. It SHALL tell Claude to mark what is known, what is assumed and what is unchecked. It SHALL apply to every markdown file Claude writes, including specs, READMEs, skills and rules.

#### Scenario: Several ideas in one bullet
- **WHEN** a bullet in a document Claude writes holds more than one idea
- **THEN** the rule SHALL require it to be split into separate bullets or a sub-list

#### Scenario: Topic without a header
- **WHEN** a document covers several topics
- **THEN** the rule SHALL require a header for each topic, nested by hierarchy

#### Scenario: Glossary exists
- **WHEN** a repository has a glossary page that defines a term the document uses
- **THEN** the rule SHALL require the document to link to it instead of redefining the term

#### Scenario: No glossary
- **WHEN** no glossary page defines a term the document uses
- **THEN** the rule SHALL require the term to be defined on first use

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
