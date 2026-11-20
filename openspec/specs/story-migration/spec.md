# story-migration Specification

## Purpose

Lets the user move stories from the open backlog to another backlog of the same data folder from the Stories tab, keeping their content and every link that names them.

## Requirements

### Requirement: Migrate button in the bulk bar
When at least one story is ticked in the Stories tab, the bulk bar SHALL offer **Migrate (N)**, N being the number of ticked stories shown. Like the other bulk actions it SHALL act on the ticked stories the search and filters show, and leave hidden ticked stories alone. It SHALL be disabled when no ticked story is shown, and when the data folder holds no other backlog, with a hint that says why.

#### Scenario: Button shows the count
- **WHEN** three stories are ticked and shown
- **THEN** the bulk bar shows "Migrate (3)"

#### Scenario: No other backlog
- **WHEN** the data folder holds only the open backlog and a story is ticked
- **THEN** Migrate is disabled and its hint says there is no other backlog in this project

#### Scenario: Hidden ticks are left alone
- **WHEN** four stories are ticked, a search hides one of them, and the user migrates
- **THEN** the three shown stories move and the hidden one stays in the open backlog, still ticked

### Requirement: Choose the target backlog
Pressing Migrate SHALL open a dialog that names how many stories will move and lists every other backlog of the data folder by name and initials. The open backlog SHALL NOT be listed, and no backlog outside the data folder SHALL be offered. The Migrate button in the dialog SHALL stay disabled until a backlog is chosen. Cancel SHALL close the dialog and change nothing.

#### Scenario: Backlogs listed
- **WHEN** the data folder holds backlogs `core` (B1), `payments` (B2) and `reporting` (B3), `core` is open, and the user presses Migrate
- **THEN** the dialog lists `payments (B2)` and `reporting (B3)`, and not `core`

#### Scenario: Cancel
- **WHEN** the user opens the dialog and presses Cancel
- **THEN** no file changes and the stories stay ticked

### Requirement: Migrated stories join the target backlog
On confirm, each migrated story SHALL leave the open backlog and be added to the target. In the target it SHALL go after the last story of the same Epic, whatever its Feature. A story whose Epic the target does not have SHALL start that Epic at the end. Several stories SHALL keep their relative order. Every field SHALL move unchanged, including Clarifications, Notes and unknown columns. Only the ID and the `Depends On` entries that name a renumbered story SHALL change.

#### Scenario: Joins an existing Epic
- **WHEN** a story of Epic "Billing" is migrated to a backlog whose Epic "Billing" has stories `B3-BIL-0001` to `B3-BIL-0004`
- **THEN** it is placed after `B3-BIL-0004` and becomes `B3-BIL-0005`

#### Scenario: Starts a new Epic
- **WHEN** a story of Epic "Search" is migrated to a backlog that has no Epic "Search"
- **THEN** the target gains the Epic "Search" at the end with that story as its first

#### Scenario: Fields move unchanged
- **WHEN** a story with two answered clarifications, Notes and a value in an unknown column is migrated
- **THEN** the story in the target has the same clarifications, Notes and unknown-column value

### Requirement: Both backlogs are renumbered
After a migration both backlogs SHALL be renumbered as "Story IDs carry initials, epic prefix and number" of `user-story-editor` describes. Migrated stories SHALL take the target's initials. Frozen stories in either backlog SHALL keep their IDs.

#### Scenario: Gap closed in the source
- **WHEN** `B1-IAM-0002` is migrated out of a backlog whose Epic has `B1-IAM-0001` to `B1-IAM-0003`
- **THEN** the former `B1-IAM-0003` becomes `B1-IAM-0002`

#### Scenario: Frozen story keeps its ID
- **WHEN** a story is migrated out of an Epic that holds the frozen story `B1-IAM-0004`
- **THEN** `B1-IAM-0004` keeps its ID

### Requirement: Links follow migrated stories
Every `Depends On` link that named a migrated story, in any backlog of the data folder, SHALL name its new ID after the migration. A migrated story's own `Depends On` SHALL keep naming the same stories under their current IDs, wherever they now live. No link SHALL be dropped because it now crosses backlogs.

#### Scenario: Link from the source follows
- **WHEN** `B1-IAM-0005` depends on `B1-IAM-0002`, and `B1-IAM-0002` is migrated to B3 as `B3-IAM-0007`
- **THEN** the story that was `B1-IAM-0005` (now `B1-IAM-0004`) depends on `B3-IAM-0007`

#### Scenario: Own link kept across backlogs
- **WHEN** `B1-IAM-0002` depends on `B1-IAM-0001`, which stays, and `B1-IAM-0002` is migrated to B3
- **THEN** the migrated story depends on `B1-IAM-0001`

### Requirement: Migration confirmation
Before anything changes, the tool SHALL ask for confirmation. The confirmation SHALL name how many stories move and to which backlog, and say that they get new IDs. When the migrated stories have open review suggestions, it SHALL say how many will be dismissed. There SHALL be no undo.

#### Scenario: Confirmation with review suggestions
- **WHEN** the user migrates three stories to `payments`, and two of them have four open review suggestions between them
- **THEN** the confirmation says 3 stories move to `payments` with new IDs and that 4 open review suggestions will be dismissed

#### Scenario: Cancelled at the confirmation
- **WHEN** the user cancels the confirmation
- **THEN** no file changes

### Requirement: Review suggestions of migrated stories are dismissed
The open review suggestions of the migrated stories, in the open backlog's review file, SHALL be marked dismissed. No suggestion SHALL be added to the target's review file.

#### Scenario: Suggestions dismissed
- **WHEN** a migrated story had two open suggestions
- **THEN** both are dismissed in the source's review file and the target's review file is unchanged

### Requirement: Columns are merged into the target
When the open backlog has a column the target lacks, the target SHALL gain that column, empty for its other stories, so no cell of a migrated story is lost. The target's existing columns and their order SHALL stay as they were.

#### Scenario: Unknown column added
- **WHEN** the open backlog has an extra column `Owner` and the target does not
- **THEN** the target gains `Owner` after its last column, the migrated stories keep their `Owner` values and the target's other stories have it empty

### Requirement: Migration never loses a story
The target backlog SHALL be written before the open backlog is changed. If writing the target fails, nothing SHALL change and the tool SHALL say why, for example that the target file is open in another program. A failure after the target is written SHALL leave the stories in both backlogs rather than in neither.

#### Scenario: Target locked
- **WHEN** the target's file is open in Excel and the user confirms a migration
- **THEN** both backlogs are unchanged, the stories stay ticked and the message names the locked file

#### Scenario: Selection after a migration
- **WHEN** a migration succeeds
- **THEN** the migrated stories leave the selection and the open backlog shows the remaining stories

### Requirement: Migration saves at once
After the target is written, the migration SHALL write the open backlog and update the links in every other backlog straight away, without waiting for the autosave delay. The note that reports the result SHALL appear only after both have finished. When either fails, the save status SHALL show failed and retry as for any save.

#### Scenario: Page closed right after the note
- **WHEN** the user migrates two linked stories and closes the page as soon as the result note shows
- **THEN** the stories are in the target only, and every link in every backlog names the same story as before

#### Scenario: Another backlog locked
- **WHEN** a third backlog's file is open in Excel during a migration
- **THEN** the save status shows failed naming that file, and the links there are updated once Excel releases it
