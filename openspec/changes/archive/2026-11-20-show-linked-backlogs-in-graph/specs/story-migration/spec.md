# Spec Delta

## REMOVED Requirements

### Requirement: Review suggestions of migrated stories are dismissed
**Reason**: Dismissing lost review work that still applies to the story after it moves. A suggestion is about one story, and a split's rows are about that story and its new parts, so the rows can move with it.
**Migration**: See "Review suggestions move with their story". The open suggestions now go to the target's review file instead of being dismissed.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Migration confirmation
Before anything changes, the tool SHALL ask for confirmation. The confirmation SHALL name how many stories move and to which backlog, and say that they get new IDs. When the migrated stories have open review suggestions, it SHALL say how many move with them. There SHALL be no undo.

#### Scenario: Confirmation with review suggestions
- **WHEN** the user migrates three stories to `payments`, and two of them have four open review suggestions between them
- **THEN** the confirmation says 3 stories move to `payments` with new IDs and that their 4 open review suggestions move with them

#### Scenario: Cancelled at the confirmation
- **WHEN** the user cancels the confirmation
- **THEN** no file changes

### Requirement: Migration never loses a story
The target backlog SHALL be written before the open backlog is changed. If writing the target fails, nothing SHALL change and the tool SHALL say why, for example that the target file is open in another program. The target's review file SHALL be written after the target backlog and before the open backlog is changed. A failure after the target backlog is written SHALL leave the stories in both backlogs rather than in neither, and the tool SHALL say so.

#### Scenario: Target locked
- **WHEN** the target's file is open in Excel and the user confirms a migration
- **THEN** both backlogs are unchanged, the stories stay ticked and the message names the locked file

#### Scenario: Target's review file locked
- **WHEN** a migrated story has an open suggestion and the target's review file is open in Excel
- **THEN** the open backlog and its review file are unchanged, the stories stay ticked, and the message names the locked file and says the stories are now in both backlogs

#### Scenario: Selection after a migration
- **WHEN** a migration succeeds
- **THEN** the migrated stories leave the selection and the open backlog shows the remaining stories

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
