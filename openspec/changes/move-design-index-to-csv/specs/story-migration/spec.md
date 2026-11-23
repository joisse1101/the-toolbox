# Spec Delta

## ADDED Requirements

### Requirement: Design rows move with their story
The design index rows of the migrated stories SHALL move from the open backlog's `design-index.csv` to the target's. Each moved row SHALL name the story's new ID and keep its criterion, kind, artboards, viewports and canvas link. The target's file SHALL be created when it has none. The confirmation SHALL say how many design rows move.

#### Scenario: Rows move
- **WHEN** a migrated story has three design rows and becomes `B3-IAM-0007`
- **THEN** the target's `design-index.csv` holds three rows on `B3-IAM-0007`, and the open backlog's file no longer holds them

#### Scenario: Canvas link kept
- **WHEN** the moved rows carry the link of a canvas that the target's `designs.json` does not list
- **THEN** the rows keep that link unchanged

#### Scenario: Story without design rows
- **WHEN** a migrated story has no design rows
- **THEN** neither design file is written

#### Scenario: Target has no design index
- **WHEN** the target backlog has no `design-index.csv` and a migrated story has design rows
- **THEN** the target gains the file holding those rows

#### Scenario: Confirmation counts the rows
- **WHEN** the user migrates two stories that have five design rows between them
- **THEN** the confirmation says 5 design rows move with them

## MODIFIED Requirements

### Requirement: Migration never loses a story
The target backlog SHALL be written before the open backlog is changed. If writing the target fails, nothing SHALL change and the tool SHALL say why, for example that the target file is open in another program. The target's review file and its design index SHALL be written after the target backlog and before the open backlog is changed. A failure after the target backlog is written SHALL leave the stories in both backlogs rather than in neither, and the tool SHALL say so.

#### Scenario: Target locked
- **WHEN** the target's file is open in Excel and the user confirms a migration
- **THEN** both backlogs are unchanged, the stories stay ticked and the message names the locked file

#### Scenario: Target's review file locked
- **WHEN** a migrated story has an open suggestion and the target's review file is open in Excel
- **THEN** the open backlog and its review file are unchanged, the stories stay ticked, and the message names the locked file and says the stories are now in both backlogs

#### Scenario: Target's design index locked
- **WHEN** a migrated story has design rows and the target's `design-index.csv` is open in Excel
- **THEN** the open backlog and its design index are unchanged, the stories stay ticked, and the message names the locked file and says the stories are now in both backlogs

#### Scenario: Selection after a migration
- **WHEN** a migration succeeds
- **THEN** the migrated stories leave the selection and the open backlog shows the remaining stories
