## ADDED Requirements

### Requirement: Viewing the slice
After a slice is written and read back, the skill SHALL tell the user that its document renders in GitHub and in the built-in VS Code markdown preview, and SHALL NOT mention a PlantUML plugin or a render server.

#### Scenario: Slice written
- **WHEN** the read-back of a written slice matches
- **THEN** the skill says where the document is and that it can be opened in GitHub or in the built-in VS Code markdown preview

## MODIFIED Requirements

### Requirement: Draft, confirm, write
The skill SHALL read the guidelines for diagrams (`diagram-conventions`), the stories in scope with every column, the backlog's lexicon and any existing slice for that scope, then show the complete final text of the slice's document, diagrams included, in one reply, run `check_diagram` and fix what it reports, ask one yes/no, and call `write_diagram` only after the user confirms. A document too long for one reply SHALL be shown whole in sections, with the yes/no asked once every section has been shown. After the call it SHALL read the slice back with `read_diagrams` in the same turn and call it written only when the read-back matches. A rejected write SHALL be fixed and resent; a write is never reported on the tool's reply alone.

#### Scenario: Nothing is written before the yes
- **WHEN** the user has not answered the yes/no
- **THEN** no `write_diagram` call has been made

#### Scenario: Read-back mismatch
- **WHEN** the slice read back differs from what was sent
- **THEN** the skill says what is missing and sends only that part

#### Scenario: Document too long for one reply
- **WHEN** the document is too long to show in one reply
- **THEN** the skill says so up front, shows each section whole, and asks the yes/no only after the last
