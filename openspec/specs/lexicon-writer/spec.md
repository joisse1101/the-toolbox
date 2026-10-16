## Purpose

Defines the only way the story skills change a lexicon: a script that validates agreed terms against the lexicon rules and adds or patches them in `lexicons/<backlog file name>`.

## Requirements

### Requirement: Writer script
The repository SHALL contain `.claude/skills/propose-stories/write-lexicon.mjs`, run as `node .claude/skills/propose-stories/write-lexicon.mjs <backlog file name>` with a JSON array of term items on standard input. It SHALL accept the backlog file name only (validated by the file store's name rules, and the backlog MUST exist in `user-stories/`) and no output path: the target is always `lexicons/<backlog file name>`. It SHALL write nothing unless every item is valid, SHALL report all problems found in one run naming each item by its position, and SHALL NOT leave a partly written file. It SHALL never remove a term and SHALL never write `user-stories/`, `proposals/` or `reviews/`.

#### Scenario: Valid input
- **WHEN** valid terms are sent for `IAM.csv`
- **THEN** they are in `lexicons/IAM.csv` and `user-stories/IAM.csv` is byte-for-byte unchanged

#### Scenario: Unknown backlog
- **WHEN** the backlog is not in `user-stories/`
- **THEN** nothing is written and the message says the backlog was not found

#### Scenario: Several problems at once
- **WHEN** item 1 has no definition and item 2 names a missing parent
- **THEN** nothing is written and both problems are reported, each naming its item

### Requirement: Add and patch terms
Each item SHALL have a `term` and SHALL be either an addition or a patch. If no term of that name exists (ignoring case) the item is an **addition** and SHALL give a `definition`; it MAY give `avoid` (a list), `notes` and `partOf`. If the term exists the item is a **patch** and SHALL change only the fields it names, keeping every other field, the term's position and all columns it does not know. An item with an unknown key SHALL be rejected. The result SHALL satisfy the term rules of `backlog-lexicon`, checked on the whole lexicon as it will be after the run, so an item MAY name as `partOf` a term added earlier in the same input. A new file SHALL be created with the lexicon's columns when none exists.

#### Scenario: New term with a parent defined in the same run
- **WHEN** the input adds "Dataset" and then "Dataset attribute" with `partOf` "Dataset"
- **THEN** both are written, in input order

#### Scenario: Patch keeps the rest
- **WHEN** an item for "User" gives only a new `avoid` list
- **THEN** that list replaces the old one, and its Definition, Notes and Part of are unchanged

#### Scenario: Term rules apply
- **WHEN** an item adds "customer" to the Avoid list of "User" and "Customer" is already a term
- **THEN** the run is rejected naming "customer" and nothing is written

#### Scenario: Unknown key
- **WHEN** an item contains a key `synonym`
- **THEN** the run is rejected and nothing is written

#### Scenario: Unknown column kept
- **WHEN** the lexicon has an extra column `Owner` and an item patches a definition
- **THEN** the `Owner` values of every term are unchanged
