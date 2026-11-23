# Spec Delta

## MODIFIED Requirements

### Requirement: Changed IDs are followed in every other backlog
When a save of a backlog changes the ID of any of its stories, every other backlog of the data folder SHALL have the old ID replaced by the new one. That covers its stories' `Depends On`, its proposals' `Depends On`, the story ID and `Depends On` values of its open review suggestions, and the `Story ID` of its design index rows. Every cause of an ID change counts: add, delete, reorder, move, Renumber, a new Epic, accepting proposals, Move to Proposed, migration, a change of initials, and the renumbering done when a file is opened.

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

#### Scenario: Migrated design rows follow
- **WHEN** design rows moved into B3 by a migration still name `B1-IAM-0004`, which becomes `B3-IAM-0007`
- **THEN** after B1 is saved the rows name `B3-IAM-0007`

#### Scenario: Unrelated design index not written
- **WHEN** B1's IDs change and no row of B3's `design-index.csv` names any of them
- **THEN** B3's file is not written

### Requirement: The open backlog's own files follow the same IDs
When the open backlog's IDs change, its own proposals' `Depends On`, its open review suggestions and the `Story ID` of its design index rows SHALL follow the new IDs in the same way, with the same list of changes. A design row whose story was deleted SHALL be dropped.

#### Scenario: Own proposal follows
- **WHEN** a proposed story of B1 depends on `B1-IAM-0004`, which becomes `B1-IAM-0003` after a drag in the Editor
- **THEN** the proposed story depends on `B1-IAM-0003`

#### Scenario: Design rows follow a renumber
- **WHEN** B1's `design-index.csv` has rows for `B1-IAM-0004`, which becomes `B1-IAM-0003` after a story above it is deleted
- **THEN** after B1 is saved the rows name `B1-IAM-0003` and keep their text, artboards and canvas

#### Scenario: Design rows of a deleted story
- **WHEN** a story with design rows is deleted
- **THEN** after B1 is saved its rows are gone and the other rows are unchanged

#### Scenario: Swapped IDs are followed once
- **WHEN** two stories with design rows swap IDs and a failed write is retried
- **THEN** each row names the story it named before the swap, and no row is swapped twice

#### Scenario: Locked design index
- **WHEN** B1's `design-index.csv` is open in Excel when B1 is saved with changed IDs
- **THEN** the save status shows failed naming that file, and the rows are updated once Excel releases it
