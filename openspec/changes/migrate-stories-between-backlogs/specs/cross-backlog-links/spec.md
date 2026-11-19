# Spec Delta

## Purpose

Keeps a story ID that one backlog's files hold for a story of another backlog in the same data folder pointing at the same story, whenever that backlog's IDs change.

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
