# Spec Delta

## MODIFIED Requirements

### Requirement: Writer script
The toolkit SHALL contain `toolkit/skills/jois-story-propose/write-lexicon.mjs`, run with Node from the skill's own folder as `node <skill folder>/write-lexicon.mjs <backlog file name>` with a JSON array of term items on standard input. It SHALL accept the backlog file name only (validated by the file store's name rules, and the backlog MUST exist in `backlogs/`) and no output path: the target is always `lexicons/<backlog file name>`. It SHALL write nothing unless every item is valid, SHALL report all problems found in one run naming each item by its position, and SHALL NOT leave a partly written file. It SHALL never remove a term and SHALL never write `backlogs/`, `proposals/` or `reviews/`.

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
The writer SHALL NOT remove, rename or change a term that exists. An item whose `term` already exists SHALL be rejected, naming the item and pointing to the lexicon-suggestion writer of `jois-story-propose` (`suggest-lexicon.mjs`). A removal, rename or change of a field wanted by the agent SHALL reach the lexicon only as a suggestion written by that script (see `lexicon-suggestions`) and applied by the user in the Lexicon tab. The writer's usage text and the skill's instructions SHALL say so.

#### Scenario: No rename key
- **WHEN** an item carries a key `newName` or `rename`
- **THEN** the run is rejected as an unknown key and nothing is written

#### Scenario: Patch cannot rename
- **WHEN** an item for "Role" gives `term` "Role" and a definition, and "Role" is a term
- **THEN** the run is rejected naming the item, nothing is written, and the lexicon is unchanged
