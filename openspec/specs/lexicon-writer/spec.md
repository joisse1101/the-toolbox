## Purpose

Defines the only way the story skills change a lexicon: a script that validates agreed new terms against the lexicon rules and adds them to `lexicons/<backlog file name>`; a change to a term that exists is a suggestion (`lexicon-suggestions`).

## Requirements

### Requirement: Writer script
The repository SHALL contain `.claude/skills/propose-stories/write-lexicon.mjs`, run as `node .claude/skills/propose-stories/write-lexicon.mjs <backlog file name>` with a JSON array of term items on standard input. It SHALL accept the backlog file name only (validated by the file store's name rules, and the backlog MUST exist in `backlogs/`) and no output path: the target is always `lexicons/<backlog file name>`. It SHALL write nothing unless every item is valid, SHALL report all problems found in one run naming each item by its position, and SHALL NOT leave a partly written file. It SHALL never remove a term and SHALL never write `backlogs/`, `proposals/` or `reviews/`.

#### Scenario: Valid input
- **WHEN** valid terms are sent for `IAM.csv`
- **THEN** they are in `lexicons/IAM.csv` and `backlogs/IAM.csv` is byte-for-byte unchanged

#### Scenario: Unknown backlog
- **WHEN** the backlog is not in `backlogs/`
- **THEN** nothing is written and the message says the backlog was not found

#### Scenario: Several problems at once
- **WHEN** item 1 has no definition and item 2 names a missing parent
- **THEN** nothing is written and both problems are reported, each naming its item

### Requirement: Removal and rename only by suggestion
The writer, in both its script and its MCP tool form, SHALL NOT remove, rename or change a term that exists. An item whose `term` already exists SHALL be rejected, naming the item and pointing to `suggest_lexicon_change`. A removal, rename or change of a field wanted by the agent SHALL reach the lexicon only as a suggestion written by `suggest_lexicon_change` (see `lexicon-suggestions`) and applied by the user in the Lexicon tab. The writer's description SHALL say so.

#### Scenario: No rename key
- **WHEN** an item carries a key `newName` or `rename`
- **THEN** the run is rejected as an unknown key and nothing is written

#### Scenario: Patch cannot rename
- **WHEN** an item for "Role" gives `term` "Role" and a definition, and "Role" is a term
- **THEN** the run is rejected naming the item, nothing is written, and the lexicon is unchanged

### Requirement: Add terms
Each item SHALL have a `term` and a `definition`; it MAY give `avoid` (a list), `notes` and `partOf`. A term name that is already in the lexicon (ignoring case), or that an earlier item of the same input adds, SHALL be rejected. An item with an unknown key SHALL be rejected. The result SHALL satisfy the term rules of `backlog-lexicon`, checked on the whole lexicon as it will be after the run, so an item MAY name as `partOf` a term added earlier in the same input. Every existing term, its position and every column the writer does not know SHALL be unchanged. A new file SHALL be created with the lexicon's columns when none exists.

#### Scenario: New term with a parent defined in the same run
- **WHEN** the input adds "Dataset" and then "Dataset attribute" with `partOf` "Dataset"
- **THEN** both are written, in input order

#### Scenario: New term under an existing parent
- **WHEN** the input adds "Dataset attribute" with `partOf` "Dataset" and "Dataset" is already a term
- **THEN** it is written and "Dataset" is unchanged

#### Scenario: Missing definition
- **WHEN** an item gives only `term`
- **THEN** the run is rejected naming the item and nothing is written

#### Scenario: Term rules apply
- **WHEN** an item adds a term whose `avoid` holds "user" and "User" is already a term
- **THEN** the run is rejected naming "user" and nothing is written

#### Scenario: Unknown key
- **WHEN** an item contains a key `synonym`
- **THEN** the run is rejected and nothing is written

#### Scenario: Unknown column kept
- **WHEN** the lexicon has an extra column `Owner` and a term is added
- **THEN** the `Owner` values of every existing term are unchanged
