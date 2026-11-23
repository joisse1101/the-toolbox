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
Every `Depends On` link that named a migrated story, in any backlog of the data folder, SHALL name its new ID after the migration. A migrated story's own `Depends On` SHALL keep naming the same stories under their current IDs, wherever they now live. No link SHALL be dropped because it now crosses backlogs. The same SHALL hold for the `Depends On` of proposed stories, the open review suggestions of every backlog, and frozen stories, whose `Depends On` follows like any other.

#### Scenario: Link from the source follows
- **WHEN** `B1-IAM-0005` depends on `B1-IAM-0002`, and `B1-IAM-0002` is migrated to B3 as `B3-IAM-0007`
- **THEN** the story that was `B1-IAM-0005` (now `B1-IAM-0004`) depends on `B3-IAM-0007`

#### Scenario: Own link kept across backlogs
- **WHEN** `B1-IAM-0002` depends on `B1-IAM-0001`, which stays, and `B1-IAM-0002` is migrated to B3
- **THEN** the migrated story depends on `B1-IAM-0001`

#### Scenario: Proposal follows the story
- **WHEN** a proposed story of B1 depends on `B1-IAM-0002`, and `B1-IAM-0002` is migrated to B3 as `B3-IAM-0007`
- **THEN** the proposed story stays in B1's proposals and depends on `B3-IAM-0007`

#### Scenario: Link becomes internal again
- **WHEN** `B3-BIL-0001` depends on `B1-IAM-0002`, and `B1-IAM-0002` is migrated to B3 as `B3-IAM-0007`
- **THEN** `B3-BIL-0001` depends on `B3-IAM-0007`, and B3's graph draws it as an arrow between two of its own stories

#### Scenario: Both ends migrated together
- **WHEN** `B1-IAM-0003` depends on `B1-IAM-0002` and both are migrated to B3 in one migration
- **THEN** in B3 the story from `B1-IAM-0003` depends on the story from `B1-IAM-0002` under its B3 ID, and no link names B1

#### Scenario: Migrated out and back
- **WHEN** `B1-IAM-0002`, on which `B1-IAM-0005` depends, is migrated to B3 and then migrated back to B1
- **THEN** it has a B1 ID again, the dependent names that ID, and no link in any backlog names its B3 ID

#### Scenario: Frozen dependent follows
- **WHEN** the frozen story `B1-IAM-0001` depends on `B1-IAM-0002`, and `B1-IAM-0002` is migrated to B3 as `B3-IAM-0007`
- **THEN** `B1-IAM-0001` keeps its ID and depends on `B3-IAM-0007`

#### Scenario: Third backlog follows
- **WHEN** a story, a proposed story and an open review suggestion for Depends On of B2 all name `B1-IAM-0002`, which is migrated to B3 as `B3-IAM-0007`
- **THEN** all three name `B3-IAM-0007` after the migration

### Requirement: Migration confirmation
Before anything changes, the tool SHALL ask for confirmation. The confirmation SHALL name how many stories move and to which backlog, and say that they get new IDs. When the migrated stories have open review suggestions, it SHALL say how many move with them. There SHALL be no undo.

#### Scenario: Confirmation with review suggestions
- **WHEN** the user migrates three stories to `payments`, and two of them have four open review suggestions between them
- **THEN** the confirmation says 3 stories move to `payments` with new IDs and that their 4 open review suggestions move with them

#### Scenario: Cancelled at the confirmation
- **WHEN** the user cancels the confirmation
- **THEN** no file changes

### Requirement: Columns are merged into the target
When the open backlog has a column the target lacks, the target SHALL gain that column, empty for its other stories, so no cell of a migrated story is lost. The target's existing columns and their order SHALL stay as they were.

#### Scenario: Unknown column added
- **WHEN** the open backlog has an extra column `Owner` and the target does not
- **THEN** the target gains `Owner` after its last column, the migrated stories keep their `Owner` values and the target's other stories have it empty

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

### Requirement: Migration saves at once
After the target is written, the migration SHALL write the open backlog and update the links in every other backlog straight away, without waiting for the autosave delay. The note that reports the result SHALL appear only after both have finished. When either fails, the save status SHALL show failed and retry as for any save.

#### Scenario: Page closed right after the note
- **WHEN** the user migrates two linked stories and closes the page as soon as the result note shows
- **THEN** the stories are in the target only, and every link in every backlog names the same story as before

#### Scenario: Another backlog locked
- **WHEN** a third backlog's file is open in Excel during a migration
- **THEN** the save status shows failed naming that file, and the links there are updated once Excel releases it

### Requirement: Review suggestions move with their story
The open review suggestions of the migrated stories SHALL move from the open backlog's review file to the target's review file. Each moved row SHALL name the story's new ID, and its `Depends On` values SHALL name the current IDs. A split's rows, its new-story rows included, SHALL move together. A Group name the target's review file already uses SHALL be replaced by one it does not use. Applied and dismissed rows SHALL stay in the open backlog's review file.

#### Scenario: Suggestions move
- **WHEN** a migrated story had two open suggestions and becomes `B3-IAM-0007`
- **THEN** the target's review file holds both, open, on `B3-IAM-0007`, and the open backlog's review file no longer holds them

#### Scenario: Split moves whole
- **WHEN** a migrated story has an open split in Group "split-login", with rows for the story and for `NEW-1` and `NEW-2`
- **THEN** every row of the split is in the target's review file under one Group, and none is left in the open backlog's

#### Scenario: Group name already used in the target
- **WHEN** the moved split's Group is "split-login" and the target's review file already has a Group "split-login"
- **THEN** the moved rows get a Group name the target's file does not use, and the target's own "split-login" rows are unchanged

#### Scenario: Decided rows stay
- **WHEN** a migrated story has one dismissed and one open suggestion
- **THEN** the open one moves and the dismissed one stays in the open backlog's review file

#### Scenario: Target has no review file
- **WHEN** the target backlog has no review file and a migrated story has an open suggestion
- **THEN** the target gains a review file holding that suggestion

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
