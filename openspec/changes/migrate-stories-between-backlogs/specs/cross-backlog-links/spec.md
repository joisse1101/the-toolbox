# Spec Delta

## Purpose

Keeps a story ID that one backlog's files hold for a story of another backlog in the same data folder pointing at the same story, whenever that backlog's IDs change, and shows such a link as a working link rather than a missing story.

## ADDED Requirements

### Requirement: A link may name a story in another backlog
A `Depends On` entry SHALL be allowed to name a story of another backlog of the same data folder. Saving a backlog SHALL keep such an entry. Because every ID starts with its backlog's initials, and initials are unique in the data folder, such an entry SHALL be taken to mean the story of the backlog whose initials it starts with.

#### Scenario: Kept on save
- **WHEN** a story of B3 depends on `B1-IAM-0004` and B3 is edited and saved
- **THEN** the saved `Depends On` still holds `B1-IAM-0004`

### Requirement: Changed IDs are followed in every other backlog
When a save of a backlog changes the ID of any of its stories, every other backlog of the data folder SHALL have the old ID replaced by the new one. That covers its stories' `Depends On`, its proposals' `Depends On`, and the story ID and `Depends On` values of its open review suggestions. Every cause of an ID change counts: add, delete, reorder, move, Renumber, a new Epic, accepting proposals, Move to Proposed, migration, a change of initials, and the renumbering done when a file is opened.

#### Scenario: Reorder in another backlog
- **WHEN** B3's story depends on `B1-IAM-0004`, and in B1 a story above it is deleted so that it becomes `B1-IAM-0003`
- **THEN** after B1 is saved, B3's story depends on `B1-IAM-0003`

#### Scenario: Initials change
- **WHEN** B1's initials change to `CORE` and B3's story depends on `B1-IAM-0004`
- **THEN** after B1 is saved, B3's story depends on `CORE-IAM-0004`

#### Scenario: Proposals and review follow
- **WHEN** a proposed story of B3 and an open review suggestion of B3 for Depends On both name `B1-IAM-0004`, which becomes `B1-IAM-0003`
- **THEN** both name `B1-IAM-0003` after B1 is saved

#### Scenario: Decided review rows are left
- **WHEN** a dismissed review suggestion of B3 names `B1-IAM-0004` and that ID changes
- **THEN** the dismissed row is unchanged

### Requirement: Deleted stories leave other backlogs' links
When a save deletes a story that had an ID, that ID SHALL be removed from the `Depends On` of the other backlogs' stories and proposals, as a delete already does inside its own backlog.

#### Scenario: Delete reaches across
- **WHEN** B3's story depends on `B1-IAM-0002;B3-BIL-0001` and `B1-IAM-0002` is deleted
- **THEN** after B1 is saved, B3's story depends on `B3-BIL-0001` only

### Requirement: The open backlog's own files follow the same IDs
When the open backlog's IDs change, its own proposals' `Depends On` and its open review suggestions SHALL follow the new IDs in the same way, with the same list of changes.

#### Scenario: Own proposal follows
- **WHEN** a proposed story of B1 depends on `B1-IAM-0004`, which becomes `B1-IAM-0003` after a drag in the Editor
- **THEN** the proposed story depends on `B1-IAM-0003`

### Requirement: Only the IDs that changed are rewritten
Rewriting SHALL replace only entries that exactly equal an ID that changed. It SHALL leave every other cell, row and column of the other backlogs' files unchanged. A file with nothing to rewrite SHALL NOT be written.

#### Scenario: Untouched file not written
- **WHEN** B1 is saved with changed IDs and no file of B2 names any of them
- **THEN** no file of B2 is written

### Requirement: A save is complete only when every backlog is updated
The save status SHALL show saved only after the backlog file is written and every other backlog's files that needed a change are written. When a file cannot be written, for example because it is open in Excel, the status SHALL show failed and name it. The tool SHALL retry until it succeeds, rewriting only the backlogs that failed. The browser SHALL warn on close while such a retry is pending.

#### Scenario: Other backlog locked
- **WHEN** B1 is saved with a changed ID and B3's `user-stories.csv` is open in Excel
- **THEN** B1's file is written, the status shows failed naming B3's file, and once Excel releases it B3 is updated and the status shows saved

#### Scenario: Retry does not repeat a done rewrite
- **WHEN** a rewrite reached B2 but failed on B3 and is retried
- **THEN** only B3 is rewritten on the retry

### Requirement: Links to other backlogs show their story
In the Editor, a `Depends On` entry that names a story of another backlog of the same data folder SHALL show that story's Title and its backlog's name, and SHALL NOT be flagged as a story that does not exist, in the story form, the story list or the Stories tab. An entry that starts with another backlog's initials but that no story of that backlog has SHALL still be flagged as a story that does not exist. Cycle checks SHALL stay within the open backlog.

#### Scenario: Link into another backlog
- **WHEN** story A of `core` depends on `P1-IAM-0003`, a story of `payments` titled "Export invoices"
- **THEN** A's Depends On shows `P1-IAM-0003` with "Export invoices" and `payments`, and A has no dependency warning

#### Scenario: Missing story in another backlog
- **WHEN** a story of `core` depends on `P1-IAM-0099` and no story of `payments` has that ID
- **THEN** the story is flagged with a dependency that does not exist

### Requirement: Required by includes other backlogs
A story's Required by SHALL list every story, in any backlog of the data folder, whose `Depends On` names it. A story of another backlog SHALL be shown with its ID, Title and backlog name.

#### Scenario: Dependent left behind by a migration
- **WHEN** story A of `core` depends on story B, and B is migrated to `payments`
- **THEN** B's Required by, with `payments` open, lists A with its ID, Title and `core`

#### Scenario: Shown after the other backlog changes
- **WHEN** a story of `reporting` is given a link to a story of `core` and saved, and the user then opens `core`
- **THEN** that `core` story's Required by lists the `reporting` story

### Requirement: The review's checks know the other backlogs
The mechanical consistency report of the review skill SHALL NOT report a `Depends On` link to an existing story of another backlog of the same data folder as a story that does not exist. A link with another backlog's initials that no story has SHALL still be reported.

#### Scenario: No removal suggested
- **WHEN** a backlog is reviewed and one of its stories depends on an existing story of another backlog
- **THEN** the report has no dependency problem for that link and the review writes no `remove` row for it
