# lexicon-suggestions Specification

## Purpose

Lets the agent suggest renaming or deleting a lexicon term without changing the lexicon itself: suggestions are stored per backlog, reported with their impact, and applied or dismissed by the user in the Lexicon tab.

## Requirements

### Requirement: Suggestions file per backlog
Each backlog SHALL have at most one lexicon suggestions file, a CSV in the data folder's `lexicon-suggestions` folder with the same file name as the backlog. The file API SHALL expose it through a `lexicon-suggestions` store like the other stores. The columns, matched by header name ignoring case, SHALL be `Term`, `Action` (`rename` or `delete`), `New name` (a rename only), `Add to Avoid` (`;`-separated words, a rename only), `Reason` and `Status` (`open`, `applied` or `dismissed`; anything else reads as `open`). A backlog without the file SHALL work without error, and the file SHALL be created when the first suggestion is written. An unknown column SHALL be kept unchanged when the file is saved.

#### Scenario: No file yet
- **WHEN** the open backlog has no suggestions file
- **THEN** the Lexicon tab shows no suggestions and no error

#### Scenario: Unknown column kept
- **WHEN** the file has an extra column and the user dismisses a suggestion
- **THEN** the saved file still holds that column with its values

### Requirement: Agent tool writes suggestions
The `story-tools` MCP server SHALL expose `suggest_lexicon_change` in a `propose-stories` session only (not with `--read-only`). It SHALL take a backlog and a list of items `{ term, action, newName?, avoid?, reason }` and SHALL append one `open` row per item to `lexicon-suggestions/<backlog>`, keeping every row already there. It SHALL write nothing unless every item is valid: the term exists (ignoring case); `action` is `rename` or `delete`; a rename gives a `newName` that is not blank, differs from the term and is not the name of another term; a delete gives no `newName`; `reason` is not blank; no open suggestion for the same term and action exists; and the words in `avoid` are not names of terms other than the one being renamed. For a rename the old name SHALL be added to `Add to Avoid` unless the item sets `avoidOldName` to false. It SHALL NOT change `lexicons/`, `user-stories/`, `proposals/` or `reviews/`. The tool description SHALL state that the user applies the suggestion in the Lexicon tab and that a delete is refused while the term has children.

#### Scenario: Rename suggested
- **WHEN** the tool is called with term "Role", action `rename`, newName "Privilege"
- **THEN** one open row is appended with `Add to Avoid` "role", and `lexicons/` is unchanged

#### Scenario: Old name not avoided
- **WHEN** the item sets `avoidOldName` to false
- **THEN** `Add to Avoid` holds only the words given in `avoid`

#### Scenario: Unknown term
- **WHEN** an item names a term the lexicon does not have
- **THEN** the call is rejected naming the item and nothing is written

#### Scenario: New name taken
- **WHEN** a rename's `newName` is already another term
- **THEN** the call is rejected and nothing is written

#### Scenario: Duplicate open suggestion
- **WHEN** an open rename of "Role" is already in the file and the tool is called with another rename of "Role"
- **THEN** the call is rejected and the file is unchanged

#### Scenario: Not in a read-only session
- **WHEN** the server is started with `--read-only`
- **THEN** `suggest_lexicon_change` is not in its tool list

### Requirement: Impact report
For every item the tool SHALL return the impact of the change on the lexicon as it is now: the terms whose `Part of` names the term (for a rename they follow the new name automatically; for a delete they block it), the other terms whose Definition or Notes contain the term's name as a whole word, the terms that list the new name or the old name in `Avoid`, and, for a rename, whether adding the old name to Avoid is allowed. The same impact SHALL be computed by one pure function shared with the Lexicon tab, so the agent's report and the screen agree.

#### Scenario: Definitions that use the old name
- **WHEN** "Role" is renamed and the definitions of "Data owner" and "Data manager" contain "role"
- **THEN** the report lists "Data owner" and "Data manager" as terms whose wording mentions the old name

#### Scenario: Delete blocked by children
- **WHEN** "Dataset" has the child "Dataset attribute" and a delete of "Dataset" is suggested
- **THEN** the report says the delete is blocked by "Dataset attribute"

### Requirement: Apply and dismiss in the Lexicon tab
The Lexicon tab SHALL list the open suggestions with the term, the action, the new name, the reason and the impact, each with Apply and Dismiss. Apply SHALL perform the same change as the tab's own rename or delete, using the same rules (`backlog-lexicon`), and for a rename SHALL also add the checked words of `Add to Avoid` to the renamed term's Avoid list, in the same save, so a word that names the term before the rename is accepted. Each word of `Add to Avoid` SHALL be a checkbox that is checked by default. The suggestion SHALL become `applied` only when the lexicon was changed; Dismiss SHALL set `dismissed` and change no term. A refused Apply SHALL leave the lexicon and the suggestion unchanged and show the reason. Statuses SHALL be saved automatically with the same retry behaviour as the other tabs.

#### Scenario: Rename applied with Avoid
- **WHEN** the user applies "Role" -> "Privilege" with "role" checked
- **THEN** the term is "Privilege", its children's `Part of` follow, "role" is in its Avoid list, and the suggestion is `applied`

#### Scenario: Avoid word unchecked
- **WHEN** the user clears "role" and applies
- **THEN** the term is renamed and "role" is not added to Avoid

#### Scenario: Delete refused
- **WHEN** the user applies a delete of "Dataset" while "Dataset attribute" is part of it
- **THEN** the lexicon is unchanged, the suggestion stays `open` and the message names "Dataset attribute"

#### Scenario: Dismiss
- **WHEN** the user dismisses a suggestion
- **THEN** it is `dismissed` and the lexicon is unchanged

### Requirement: Stale suggestions
A suggestion SHALL be stale, shown with the reason and with Apply disabled (Dismiss stays available), when its term no longer exists (ignoring case) or, for a rename, when `New name` is now the name of another term. Opening a backlog SHALL NOT change statuses by itself.

#### Scenario: Term already deleted
- **WHEN** a suggestion names "Role" and the user deleted "Role" by hand
- **THEN** the suggestion shows "term no longer exists" and Apply is disabled

#### Scenario: Name taken since
- **WHEN** a rename to "Privilege" is open and the user added another term "Privilege"
- **THEN** the suggestion is stale and Apply is disabled
