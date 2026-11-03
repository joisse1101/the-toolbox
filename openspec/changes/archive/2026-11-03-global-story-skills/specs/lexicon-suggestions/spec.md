# Spec Delta

## MODIFIED Requirements

### Requirement: Agent tool writes suggestions
The `jois-story-propose` skill SHALL write suggestions with its bundled script `suggest-lexicon.mjs`, run with Bash. The `jois-story-explore` skill SHALL NOT run it. The script SHALL take a backlog and a list of items `{ term, action, newName?, avoid?, avoidOldName?, definition?, notes?, partOf?, reason }` and SHALL append one `open` row per item to `lexicon-suggestions/<backlog>`, keeping every row already there. It SHALL write nothing unless every item is valid: the term exists (ignoring case); `action` is `rename`, `delete` or `edit`; a rename gives a `newName` that is not blank, differs from the term and is not the name of another term; a delete gives no `newName`; an edit gives no `newName` or `avoidOldName`, names at least one of `definition`, `avoid`, `notes` and `partOf`, changes each field it names from the term's value now, and leaves the lexicon within the term rules of `backlog-lexicon` once applied (so an `avoid` word may not be a term name); `reason` is not blank; no open suggestion for the same term and action exists; and the words in `avoid` are not names of terms other than the one being renamed. For a rename the old name SHALL be added to `Add to Avoid` unless the item sets `avoidOldName` to false. It SHALL NOT change `lexicons/`, `backlogs/`, `proposals/` or `reviews/`. The skill's instructions SHALL state that the user applies the suggestion in the Lexicon tab, that a delete is refused while the term has children, and that an edit replaces each field it names (`avoid` as a whole list).

#### Scenario: Rename suggested
- **WHEN** the script is run with term "Role", action `rename`, newName "Privilege"
- **THEN** one open row is appended with `Add to Avoid` "role", and `lexicons/` is unchanged

#### Scenario: Old name not avoided
- **WHEN** the item sets `avoidOldName` to false
- **THEN** `Add to Avoid` holds only the words given in `avoid`

#### Scenario: Unknown term
- **WHEN** an item names a term the lexicon does not have
- **THEN** the run is rejected naming the item and nothing is written

#### Scenario: New name taken
- **WHEN** a rename's `newName` is already another term
- **THEN** the run is rejected and nothing is written

#### Scenario: Duplicate open suggestion
- **WHEN** an open rename of "Role" is already in the file and the script is run with another rename of "Role"
- **THEN** the run is rejected and the file is unchanged

#### Scenario: Not in a read-only session
- **WHEN** a user explores a term change in `jois-story-explore`
- **THEN** the skill only discusses it and runs no writer

#### Scenario: Edit suggested
- **WHEN** the script is run with term "User", action `edit` and `avoid` ["customer", "account holder"]
- **THEN** one open row is appended holding the old and new Avoid list, and `lexicons/` is unchanged

#### Scenario: Edit that changes nothing
- **WHEN** an edit gives a `definition` equal to the term's definition now
- **THEN** the run is rejected naming the item and nothing is written

#### Scenario: Edit breaks a term rule
- **WHEN** an edit adds "dataset" to the Avoid list of "Table" and "Dataset" is a term
- **THEN** the run is rejected naming "dataset" and nothing is written

#### Scenario: Duplicate open edit
- **WHEN** an open edit of "User" exists and the script is run with another edit of "User"
- **THEN** the run is rejected and the file is unchanged

#### Scenario: Edit and rename together
- **WHEN** an open rename of "Role" exists and an edit of "Role" is suggested
- **THEN** both are written as open rows

### Requirement: Impact report
For every item the writer SHALL return the impact of the change on the lexicon as it is now: the terms whose `Part of` names the term (for a rename they follow the new name automatically; for a delete they block it), the other terms whose Definition or Notes contain the term's name as a whole word, the terms that list the new name or the old name in `Avoid`, and, for a rename, whether adding the old name to Avoid is allowed. The same impact SHALL be computed by one pure function shared with the Lexicon tab, so the agent's report and the screen agree.

#### Scenario: Definitions that use the old name
- **WHEN** "Role" is renamed and the definitions of "Data owner" and "Data manager" contain "role"
- **THEN** the report lists "Data owner" and "Data manager" as terms whose wording mentions the old name

#### Scenario: Delete blocked by children
- **WHEN** "Dataset" has the child "Dataset attribute" and a delete of "Dataset" is suggested
- **THEN** the report says the delete is blocked by "Dataset attribute"
