## ADDED Requirements

### Requirement: Back up the open backlog
The editor SHALL show a Backup button in the file bar next to New and Open folder. The button SHALL be disabled while no backlog is open. Pressing it SHALL back up the open backlog, its review and its proposals as one backup (see the csv-file-store capability), after first waiting until every pending save of those three files has reached disk. If a save is failing, the editor SHALL NOT make a backup and SHALL say that the latest changes are not saved yet. On success the editor SHALL show a message naming the backlog and the time of the backup. On failure it SHALL show the reason and leave the backlog, review and proposals as they were.

#### Scenario: Backup with edits just typed
- **WHEN** the user edits a story and presses Backup before the auto-save has run
- **THEN** the pending edit is saved first, and the backup holds the edited backlog

#### Scenario: Backup after a review decision
- **WHEN** the user applies a review suggestion and presses Backup right away
- **THEN** the review's new status is saved first, and the backup holds it

#### Scenario: Successful backup
- **WHEN** the user presses Backup on `sprint-12.csv` and the backup succeeds
- **THEN** a message such as "Backed up sprint-12.csv at 14:32" is shown, and the new backup appears in the Backups tab

#### Scenario: Saving is failing
- **WHEN** the backlog cannot be saved (for example it is open in Excel) and the user presses Backup
- **THEN** no backup is made and the message says the latest changes could not be saved

#### Scenario: No backlog open
- **WHEN** there is no backlog in the data folder
- **THEN** the Backup button is disabled

#### Scenario: Backup is not repeated by accident
- **WHEN** the user presses Backup twice in a row
- **THEN** two separate backups exist and neither overwrote the other

### Requirement: Backups tab
The editor SHALL show a Backups tab for the open backlog, listing its backups newest first with their date and time. The tab SHALL let the user choose two states to compare, each either one of the backups or the current files, and SHALL show the resulting diff with added, removed and moved lines in distinct colors. The tab SHALL NOT offer to restore, delete or edit a backup. Before comparing with the current files, the editor SHALL wait until pending saves have reached disk, so "current" matches what is on screen.

#### Scenario: Backlog with backups
- **WHEN** the user opens the Backups tab of a backlog with two backups
- **THEN** both are listed, newest first, and two selectors offer them plus "Current"

#### Scenario: No backups yet
- **WHEN** the backlog has no backups
- **THEN** the tab says so and points to the Backup button

#### Scenario: Compare a backup with the current state
- **WHEN** the user edits a story, then compares the latest backup with "Current"
- **THEN** the edit is saved first and the diff shows that change

#### Scenario: Compare two backups
- **WHEN** the user selects two different backups and compares
- **THEN** the diff between them is shown, with removed, added and moved lines in distinct colors

#### Scenario: Nothing differs
- **WHEN** the two chosen states are identical
- **THEN** the tab says there are no differences

#### Scenario: Same state chosen twice
- **WHEN** both selectors name the same state
- **THEN** the compare action is disabled

#### Scenario: Comparison fails
- **WHEN** the comparison cannot run (for example git is missing)
- **THEN** the tab shows the reason, and the rest of the editor keeps working
