## ADDED Requirements

### Requirement: Removal and rename only by suggestion
The writer, in both its script and its MCP tool form, SHALL NOT remove or rename a term. An item whose `term` exists is a patch and cannot change the term's name. A removal or rename wanted by the agent SHALL reach the lexicon only as a suggestion written by `suggest_lexicon_change` (see `lexicon-suggestions`) and applied by the user in the Lexicon tab. The writer's description SHALL say so.

#### Scenario: No rename key
- **WHEN** an item carries a key `newName` or `rename`
- **THEN** the run is rejected as an unknown key and nothing is written

#### Scenario: Patch cannot rename
- **WHEN** an item for "Role" gives `term` "Role" and a definition
- **THEN** the term keeps the name "Role"
