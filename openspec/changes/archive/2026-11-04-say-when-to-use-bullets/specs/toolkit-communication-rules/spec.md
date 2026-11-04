# Spec Delta

## ADDED Requirements

### Requirement: Bullets are for parallel items and reasoning is a paragraph
The documents rule SHALL tell Claude to use bullets only for parallel items that can be reordered without losing meaning, such as flags, file names or rules. It SHALL tell Claude to write explanations, reasons and cause-and-effect as a short paragraph. It SHALL give a read-aloud test, a three-bullet minimum, and a rule that a header holds a paragraph and not a single bullet.

#### Scenario: Reasoning stays a paragraph
- **WHEN** Claude writes or rewrites a fact, the reason for it and what follows from it
- **THEN** the rule SHALL require them to stay in one short paragraph, with the words "because" and "so" attached to what they connect

#### Scenario: Parallel items stay a list
- **WHEN** Claude writes items that can be reordered without changing the meaning, such as a set of flags or file names
- **THEN** the rule SHALL allow them to remain a bulleted list

#### Scenario: Read-aloud test
- **WHEN** a bullet starts with "So", "Because" or "This", or only makes sense after the bullet before it
- **THEN** the rule SHALL require the text to be written as a paragraph

#### Scenario: Fewer than three bullets
- **WHEN** a list would hold fewer than three bullets
- **THEN** the rule SHALL require it to be written as a sentence

#### Scenario: Bullet with two sentences
- **WHEN** a bullet holds two sentences
- **THEN** the rule SHALL treat it as a paragraph split wrongly and require it to be written as a paragraph

#### Scenario: Header holding one bullet
- **WHEN** a header would hold only a single bullet
- **THEN** the rule SHALL require a paragraph of content under it, or no header

### Requirement: Numbered lists and rewrites keep their meaning
The documents rule SHALL tell Claude to use a numbered list only for steps a person does in order. It SHALL tell Claude, when it rewrites existing text, to check that each reason and each "because" from the old text survives in the new text.

#### Scenario: Numbered list for steps
- **WHEN** Claude writes steps a person does in order
- **THEN** the rule SHALL allow a numbered list

#### Scenario: Numbered list for other items
- **WHEN** the items are not steps done in order
- **THEN** the rule SHALL NOT allow a numbered list

#### Scenario: Rewrite keeps the reasons
- **WHEN** Claude rewrites existing text that gives a reason for a fact
- **THEN** the rule SHALL require the rewrite to still give that reason

### Requirement: The documents rule follows its own bullet rules
The rule file `toolkit/rules/jois-comms-documents.md` SHALL itself obey the bullet rules it states. Where a section would hold fewer than three bullets, it SHALL be written as a short paragraph.

#### Scenario: No list of fewer than three
- **WHEN** the rule file is read
- **THEN** it SHALL contain no bulleted list of fewer than three bullets

## MODIFIED Requirements

### Requirement: Documents are organized
The documents rule SHALL tell Claude to give each topic of a markdown document its own header and to keep a clear hierarchy of headers. It SHALL tell Claude to keep each bullet that remains after the bullet test to one idea in one short sentence, to move a second idea into its own bullet or a sub-list, and to define a technical term on first use unless the repository has a glossary or definitions page, in which case Claude SHALL link to it. It SHALL tell Claude to put the purpose or the result of a document first. It SHALL tell Claude to name who owns a next step and by when. It SHALL tell Claude to mark what is known, what is assumed and what is unchecked. It SHALL apply to every markdown file Claude writes, including specs, READMEs, skills and rules.

#### Scenario: Several ideas in one bullet
- **WHEN** a bullet that remains after the bullet test, in a document Claude writes, holds more than one idea
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

### Requirement: Toolkit markdown follows the documents rule
The toolkit's own markdown files (`toolkit/rules/`, `toolkit/commands/`, `toolkit/agents/` and `toolkit/README.md`) SHALL follow `jois-comms-documents.md`: purpose or result first, a header per topic nested by hierarchy, bullets only for parallel items, one idea per remaining bullet in one short sentence, technical terms defined on first use, an owner and a date on each next step, and what is known, assumed and unchecked kept apart. A file written before the bullet rules were added SHALL be brought in line when it is next edited, and not before. Each file that changes SHALL have its `metadata.version` and `metadata.last_updated` updated where it has them.

#### Scenario: Instruction files are structured
- **WHEN** a rule, command or agent file is read
- **THEN** it SHALL open with its purpose and use a header for each topic
- **AND** each bullet that remains after the bullet test SHALL hold one idea

#### Scenario: Changed file carries a new version
- **WHEN** a rule, command or agent file with a `metadata` header is rewritten
- **THEN** its `metadata.version` SHALL increase and its `metadata.last_updated` SHALL be the date of the change

#### Scenario: Older file is not rewritten early
- **WHEN** a toolkit file was written before the bullet rules were added and is not otherwise being edited
- **THEN** it SHALL NOT be required to change

### Requirement: README lists the communication rules
`toolkit/README.md` SHALL list both communication rules. It SHALL say that two rules are unscoped, the commit rule and the replies rule, and SHALL say why the replies rule is short. Its summary of the documents rule SHALL state that bullets are for parallel items and that reasoning is written as a paragraph.

#### Scenario: README names the rules
- **WHEN** a reader opens the README's rules section
- **THEN** it SHALL name `jois-comms-replies` and `jois-comms-documents` and say when each loads

#### Scenario: README summary matches the rule
- **WHEN** a reader reads the README's summary of `jois-comms-documents`
- **THEN** it SHALL say that bullets are for parallel items and that reasoning is written as a paragraph
