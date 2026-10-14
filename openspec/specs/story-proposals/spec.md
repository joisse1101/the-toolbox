# story-proposals Specification

## Purpose

Holds stories that are proposed but not yet in the backlog, in a separate `proposals/` store with placeholder IDs, and moves them into the backlog on acceptance without breaking derived IDs or dependency links.

## Requirements

### Requirement: Proposals store
The system SHALL keep proposed stories in a `proposals` folder, one CSV file per backlog with the same file name as the backlog (for example `proposals/data-portal.csv` for `user-stories/data-portal.csv`). The folder SHALL be a registered data folder of the CSV file store, so the existing access rules apply (only `.csv` files directly inside the folder). A proposals file SHALL have the same columns as a backlog CSV, SHALL be opened by Excel as UTF-8, and its content SHALL be git-ignored. The file need not exist: a backlog without one has no proposed stories, and the file SHALL be created when the first proposed story is added.

#### Scenario: Same name as the backlog
- **WHEN** the backlog `data-portal.csv` is open and `proposals/data-portal.csv` exists
- **THEN** that file holds its proposed stories

#### Scenario: Same rules as other stores
- **WHEN** a request names `../x.csv` in the proposals store
- **THEN** it is rejected and no file is touched

### Requirement: Placeholder IDs
Stories in a proposals file SHALL be identified by placeholder IDs of the form `NEW-<n>`, and their IDs SHALL NOT be derived from Epic and position. Loading, editing, reordering or deleting proposed stories SHALL NOT change a placeholder ID. A new proposed story SHALL get a number higher than every `NEW-<n>` in the proposals file and in the `Depends On` column of the backlog, so a placeholder number is never reused while something still refers to it.

#### Scenario: Epic changes keep the ID
- **WHEN** the Epic of `NEW-3` is changed in the Proposed tab
- **THEN** its ID is still `NEW-3`

#### Scenario: Number not reused
- **WHEN** the backlog has a story depending on `NEW-5` and `NEW-5` is no longer in the proposals file
- **THEN** a story added in the Proposed tab gets a number above 5

### Requirement: Proposed tab
The editor SHALL always show a **Proposed** tab for the open backlog, labelled with the number of proposed stories (0 when there is no proposals file). The tab SHALL offer the Editor tab's story list and story form on the proposals file: the user can add, edit, delete and reorder proposed stories, and changes SHALL be saved automatically with the same retry behaviour as the backlog. A `Depends On` choice SHALL offer both backlog stories and other proposed stories. The tab SHALL NOT show review suggestions.

#### Scenario: Tab without a file
- **WHEN** a backlog has no file in `proposals/`
- **THEN** the Proposed tab shows `Proposed (0)` and an empty story list, and no file is created

#### Scenario: First story creates the file
- **WHEN** the user adds a story in the Proposed tab and no proposals file exists
- **THEN** `proposals/<backlog>.csv` is created holding that story

#### Scenario: Edit and autosave
- **WHEN** the user edits the Title of a proposed story
- **THEN** `proposals/<backlog>.csv` is updated and the backlog file is unchanged

#### Scenario: Depend on a backlog story
- **WHEN** the user opens the Depends On choices of a proposed story
- **THEN** both existing backlog stories and other proposed stories are offered, and a choice that would close a cycle is not

### Requirement: Accept proposed stories
The Proposed tab SHALL let the user tick any number of proposed stories and SHALL offer **Accept selected (n)**, which moves exactly the ticked stories, and **Accept all** for every proposed story. Accepting SHALL move each accepted story, with all its fields and any unknown columns, from the proposals file into the backlog and remove it from the proposals file; stories that were not ticked SHALL stay proposed. **Accept selected** SHALL be disabled while nothing is ticked. A story without an Epic SHALL NOT be accepted, and the user SHALL be told why. If any story in the request cannot be accepted, none SHALL be moved.

#### Scenario: Accept one
- **WHEN** the user ticks one proposed story and accepts the selection
- **THEN** it is in the backlog, it is gone from the proposals file, and the other proposed stories remain

#### Scenario: Accept some
- **WHEN** the user ticks 2 of 5 proposed stories and accepts the selection
- **THEN** those 2 are in the backlog, they are gone from the proposals file, and the other 3 remain

#### Scenario: Accept all
- **WHEN** the user accepts all
- **THEN** every proposed story is in the backlog and the proposals file has no stories

#### Scenario: No Epic
- **WHEN** a ticked story has no Epic and the user accepts the selection
- **THEN** nothing moves and a message says the story needs an Epic

#### Scenario: Nothing ticked
- **WHEN** no story is ticked
- **THEN** Accept selected is disabled

### Requirement: Placement of accepted stories
An accepted story SHALL be placed after the last story of its Epic, whatever its Feature, so an Epic with 7 stories gets an 8th. When several stories are accepted together they SHALL keep their order from the proposals file within their Epic. A story whose Epic does not exist in the backlog SHALL start a new Epic after the last story of the backlog. After placement the backlog IDs SHALL be recomputed by the normal rule (Epic initials and position within the Epic), with every `Depends On` link following its story.

#### Scenario: End of the Epic
- **WHEN** an Epic has 7 stories and a proposed story in that Epic, under a Feature that sits in the middle of the Epic, is accepted
- **THEN** it becomes the 8th story of the Epic and receives the 8th ID of that Epic

#### Scenario: New Epic
- **WHEN** a proposed story names an Epic that has no stories in the backlog
- **THEN** it is added after the last story of the backlog and the new Epic gets its own ID prefix

#### Scenario: Existing links follow
- **WHEN** an accepted story is inserted before stories that other stories depend on
- **THEN** those `Depends On` entries still point at the same stories

### Requirement: Dependencies when accepting
A proposed story SHALL be acceptable on its own even if it has `Depends On` entries. An entry naming a backlog story SHALL stay as it is. An entry naming another story accepted in the same action SHALL be rewritten to that story's new ID. An entry naming a story that is still proposed SHALL stay as its `NEW-<n>` placeholder and the editor SHALL flag it as a dependency on a story that is still proposed; when that story is later accepted, every `Depends On` entry in the backlog that names its placeholder SHALL be rewritten to its new ID. Proposed stories that depended on an accepted story SHALL be rewritten to its new ID. An accept that would create a dependency cycle SHALL be refused and nothing SHALL move.

#### Scenario: Link to a backlog story
- **WHEN** a proposed story depending on `IAM-0002` is accepted alone
- **THEN** its `Depends On` is still the story that was `IAM-0002`, under that story's current ID

#### Scenario: Accepted together
- **WHEN** `NEW-1` and `NEW-2` (which depends on `NEW-1`) are accepted together
- **THEN** `NEW-2` depends on the new ID of `NEW-1`

#### Scenario: Accepted one at a time
- **WHEN** `NEW-2` (depends on `NEW-1`) is accepted alone, and `NEW-1` is accepted later
- **THEN** after the first accept `NEW-2` in the backlog depends on `NEW-1` and is flagged as depending on a proposed story, and after the second accept it depends on the new ID of `NEW-1`

#### Scenario: Remaining proposals re-pointed
- **WHEN** `NEW-1` is accepted while proposed `NEW-3` depends on it
- **THEN** `NEW-3` in the proposals file depends on the new ID of `NEW-1`

#### Scenario: Cycle refused
- **WHEN** accepting would make a story depend on itself through other stories
- **THEN** nothing moves and a message names the cycle

### Requirement: Accept is saved to both files
After accepting, the backlog file and the proposals file SHALL both be saved automatically. A save failure on either file SHALL be reported and retried like any other autosave failure, and SHALL NOT undo the in-memory result.

#### Scenario: Locked proposals file
- **WHEN** the proposals file is open in Excel while the user accepts a story
- **THEN** the backlog is saved, the failure to save the proposals file is shown, and the save is retried

### Requirement: Move a backlog story to Proposed
The story form in the Editor tab SHALL offer **Move to Proposed** for the open story, in the header row beside its ID. Moving SHALL remove the story from the backlog and add it, with all its fields and unknown columns, to the end of the proposals file under a new placeholder ID `NEW-<n>` chosen by the placeholder rule. The story's own `Depends On` entries SHALL stay as they are. Every `Depends On` entry in the backlog and in the proposals file that named the story's old ID SHALL be rewritten to the new placeholder, and the backlog IDs SHALL then be recomputed by the normal rule. A story without an ID (no Epic yet) SHALL NOT be movable and the button SHALL be disabled for it. The move SHALL be saved to both files like an accept.

#### Scenario: Move one story
- **WHEN** the user moves `IAM-0003` to Proposed
- **THEN** it is gone from the backlog, it is in the proposals file as `NEW-<n>` with its other fields unchanged, and the backlog stories below it have shifted up

#### Scenario: Links follow the story
- **WHEN** `IAM-0005` depends on `IAM-0003` and `IAM-0003` is moved to Proposed
- **THEN** `IAM-0005` (under its new ID) depends on `NEW-<n>` and is flagged as depending on a proposed story

#### Scenario: Own dependencies kept
- **WHEN** a story depending on `IAM-0002` is moved to Proposed
- **THEN** the proposed story still depends on that backlog story

#### Scenario: No Epic
- **WHEN** a story has no ID because it has no Epic
- **THEN** Move to Proposed is disabled

#### Scenario: Round trip
- **WHEN** a moved story is accepted again
- **THEN** it is placed at the end of its Epic by the normal placement rule, not at its old position
