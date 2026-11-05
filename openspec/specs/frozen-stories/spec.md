# frozen-stories Specification

## Purpose
Define the frozen state of a story: a story the plan skill has fixed keeps its ID and is read-only in the portal, so later work can refer to it safely.

## Requirements

### Requirement: A story is frozen or not
Each story SHALL be either frozen or not frozen. The state SHALL be stored in the `Frozen` column of the backlog CSV as `Yes` (frozen) or empty (not frozen), and any other value SHALL be read as not frozen. A story without an ID SHALL NOT be frozen. The `Frozen` column replaces the `Locked` column: a `Locked` column in a file SHALL be ignored, no story SHALL become frozen because of it, and the column SHALL be dropped the next time the file is saved.
#### Scenario: Frozen saved and reloaded
- **WHEN** a frozen story is saved and the file is reloaded
- **THEN** the row has `Yes` in `Frozen` and the story is still frozen

#### Scenario: Old lock is not converted
- **WHEN** a file whose `Locked` column holds `Yes` for three stories is opened and saved
- **THEN** none of the three stories is frozen and the saved file has no `Locked` column

#### Scenario: No ID, no freeze
- **WHEN** a file marks a story with a blank Epic as frozen
- **THEN** the story is read as not frozen

### Requirement: Only the plan skill freezes stories
Only `jois-story-plan` SHALL freeze stories, and the portal SHALL NOT offer any control that freezes or unfreezes a story, an Epic, a Feature or a selection. Freezing SHALL happen only after the user has confirmed a slice, with the same yes/no that the skill asks before it writes the slice, and SHALL cover every story that slice covers. The skill SHALL freeze through its own validated writer. The writer SHALL refuse a story that has no ID, and a story whose ID does not begin with the backlog's initials (an ID the portal has not yet rewritten), and SHALL leave a story that is already frozen as it is, so freezing the same story twice leaves the same result as freezing it once. It SHALL change only the `Frozen` flag of the stories it names: no other field, row, column or ID SHALL change. It SHALL write atomically, and the skill SHALL read the backlog back in the same turn and call the stories frozen only when the read-back matches. A frozen story SHALL NOT be unfrozen by any way the system offers. A freeze made by mistake SHALL be undone only by editing the CSV by hand, and the project's wiki SHALL say so.

#### Scenario: Freeze after the confirm
- **WHEN** the user confirms a slice that covers three stories with IDs
- **THEN** after the slice is written the three stories have `Yes` in `Frozen`, and no other cell of the backlog changed

#### Scenario: Nothing frozen before the yes
- **WHEN** the user has not answered the yes/no
- **THEN** no story is frozen

#### Scenario: Story with no ID
- **WHEN** a slice covers a story that has no ID
- **THEN** the writer refuses that story, it stays not frozen, and the skill tells the user which story it could not freeze and why

#### Scenario: ID without the backlog's initials
- **WHEN** a slice covers a story whose ID is `IAM-0003` and the backlog's initials are `B1`
- **THEN** the writer refuses that story, it stays not frozen, and the skill tells the user to open the backlog in the portal first so its IDs are rewritten

#### Scenario: Already frozen
- **WHEN** a slice covers a story that is already frozen
- **THEN** the story is left as it is and the file is otherwise unchanged

#### Scenario: Freezing twice
- **WHEN** the same freeze is run again after it succeeded
- **THEN** the backlog is unchanged

#### Scenario: Portal cannot freeze or unfreeze
- **WHEN** a story is open in the Editor tab or selected in the Stories tab
- **THEN** there is no control that freezes it or unfreezes it

### Requirement: A frozen story keeps its ID
A frozen story SHALL keep its ID for good: recomputing the IDs of a backlog, whether it follows an add, a delete, a reorder, a move, a renumber or a load, SHALL NOT change it, and a change of the backlog's initials SHALL NOT change it. The number of a frozen story SHALL NOT be given to another story, so numbers may have gaps. A frozen story SHALL NOT be deleted by any way the system offers. The prefix of the Epic of a frozen story SHALL be fixed from the Epic's first frozen story and SHALL stay reserved for that Epic, so no two stories in a backlog ever share an ID. The ID of a frozen story that the file holds in a form the system cannot keep (for example one that repeats another story's ID) SHALL be shown as a problem and left as it is.

#### Scenario: Reorder around a frozen story
- **WHEN** `B1-IAM-0002` is frozen and the stories above it are deleted and reordered
- **THEN** it is still `B1-IAM-0002`, and the stories that are not frozen take the lowest free numbers around it

#### Scenario: Number not reused
- **WHEN** `B1-IAM-0003` is frozen and a new story is added to the same Epic
- **THEN** the new story does not take the number 3

#### Scenario: Cannot be deleted
- **WHEN** the user tries to delete a frozen story by any control the portal offers
- **THEN** the story is not deleted and the user is told it is frozen

#### Scenario: Epic prefix fixed
- **WHEN** the Epic "Identity & Access Management" has a frozen story with the prefix `IAM`
- **THEN** every story of that Epic uses the prefix `IAM`, and a later Epic with the same initials gets another prefix

### Requirement: A frozen story is read-only
In the portal, every field of a frozen story SHALL be read-only: Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria, Notes and Clarifications. A frozen story SHALL be marked as frozen in the story list and in the Stories tab, and its form SHALL say that it is frozen and read-only. It SHALL NOT be draggable, SHALL NOT be moved to Proposed, SHALL NOT be deleted, and a bulk edit and a bulk delete SHALL skip it and say how many frozen stories were skipped. A review suggestion for a frozen story SHALL be shown without an enabled Apply. Another story MAY still list a frozen story in its own `Depends On`, because that edits the other story. A frozen story SHALL still be shown, selected, searched and read like any other.

#### Scenario: Fields are read-only
- **WHEN** a frozen story is open in the Editor tab
- **THEN** the form says it is frozen and none of its fields can be edited

#### Scenario: Not draggable
- **WHEN** the user tries to drag a frozen story
- **THEN** it does not move

#### Scenario: Bulk edit skips it
- **WHEN** five stories are selected, two of them frozen, and the user applies a Priority to the selection
- **THEN** the three stories that are not frozen get the Priority, the two frozen ones are unchanged, and the message says 2 frozen stories were skipped

#### Scenario: Depended on by another story
- **WHEN** the user adds a frozen story to the Depends On of a story that is not frozen
- **THEN** the dependency is saved and the frozen story is unchanged

### Requirement: Frozen stories are reference only
The story skills SHALL treat a frozen story as reference only: `jois-story-review` SHALL NOT review it and SHALL use it as context for the stories it reviews, and no story skill SHALL write a suggestion or a change that edits a frozen story's text. A change to a frozen story SHALL be made by a new story that supersedes it. That superseding story is not part of this capability and is defined by a later change; until then the skills SHALL tell the user that the story is frozen and that a change needs a superseding story, and SHALL write nothing for the edit.

#### Scenario: Review skips a frozen story
- **WHEN** a backlog has 40 stories and 28 are frozen
- **THEN** the review is run for the 12 stories that are not frozen, and the frozen ones are used only as context

#### Scenario: Edit asked for a frozen story
- **WHEN** the user asks a story skill to change the Title of a frozen story
- **THEN** the skill says the story is frozen and that a change needs a superseding story, and it writes no row for the edit

### Requirement: A proposed story is never frozen
A story in the proposals SHALL NOT be frozen, and a proposed story SHALL NOT carry the `Frozen` flag. A story accepted into the backlog SHALL be not frozen. A story that is frozen SHALL NOT be moved to Proposed.

#### Scenario: Accepted story
- **WHEN** a proposed story is accepted into the backlog
- **THEN** it is not frozen

#### Scenario: Proposals file
- **WHEN** a proposals file is read or saved
- **THEN** no proposed story is frozen
