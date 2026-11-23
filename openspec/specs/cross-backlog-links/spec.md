# cross-backlog-links Specification

## Purpose

Keeps a story ID that one backlog's files hold for a story of another backlog in the same data folder pointing at the same story, whenever that backlog's IDs change, and shows such a link as a working link rather than a missing story.

## Requirements

### Requirement: A link may name a story in another backlog
A `Depends On` entry SHALL be allowed to name a story of another backlog of the same data folder. Saving a backlog SHALL keep such an entry. Because every ID starts with its backlog's initials, and initials are unique in the data folder, such an entry SHALL be taken to mean the story of the backlog whose initials it starts with.

#### Scenario: Kept on save
- **WHEN** a story of B3 depends on `B1-IAM-0004` and B3 is edited and saved
- **THEN** the saved `Depends On` still holds `B1-IAM-0004`

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

### Requirement: Deleted stories leave other backlogs' links
When a save deletes a story that had an ID, that ID SHALL be removed from the `Depends On` of the other backlogs' stories and proposals, as a delete already does inside its own backlog.

#### Scenario: Delete reaches across
- **WHEN** B3's story depends on `B1-IAM-0002;B3-BIL-0001` and `B1-IAM-0002` is deleted
- **THEN** after B1 is saved, B3's story depends on `B3-BIL-0001` only

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

### Requirement: The graph shows stories of other backlogs as dashed nodes
At the Stories level, the Graph tab SHALL draw each story of another backlog of the data folder that a story of the open backlog depends on, or that depends on a story of the open backlog, as a dashed node. The node SHALL show the story's ID, Title and backlog name. An arrow SHALL join it to each open-backlog story it is linked with. Links between two stories of other backlogs SHALL NOT be drawn.

#### Scenario: Dependency in another backlog
- **WHEN** story `B1-IAM-0004` of `core` depends on `B3-BIL-0002` of `payments`, titled "Export invoices", and `core` is open
- **THEN** the graph shows a dashed node `B3-BIL-0002` "Export invoices" labelled `payments`, with an arrow from `B1-IAM-0004` to it

#### Scenario: Dependent in another backlog
- **WHEN** story `B2-REP-0002` of `reporting` depends on `B1-IAM-0004` of `core`, and `core` is open
- **THEN** the graph shows a dashed node `B2-REP-0002` labelled `reporting`, with an arrow from it to `B1-IAM-0004`

#### Scenario: Story with only a link to another backlog
- **WHEN** a story of the open backlog has no link inside it and depends only on a story of another backlog
- **THEN** it is drawn in the graph with that link, not listed under "No dependencies"

#### Scenario: Two linked stories, one migrated
- **WHEN** `B1-IAM-0005` depends on `B1-IAM-0002` in `core`, and `B1-IAM-0002` is migrated to `payments` as `B3-IAM-0007`
- **THEN** with `core` open, the story now `B1-IAM-0004` has an arrow to a dashed node `B3-IAM-0007` labelled `payments`, and with `payments` open, `B3-IAM-0007` has an arrow from a dashed node `B1-IAM-0004` labelled `core`

### Requirement: Dashed nodes are read-only
A dashed node SHALL be selectable, which highlights the stories it is linked with as for any node, and the hint SHALL name its backlog. It SHALL NOT be opened in the Editor, offer a link handle or Link, or be accepted as the end of a new link. An arrow from an open-backlog story to a dashed node SHALL be removable as any arrow, because the open backlog stores it. An arrow from a dashed node SHALL NOT be removable.

#### Scenario: Select a dashed node
- **WHEN** the user selects the dashed node `B3-BIL-0002` of `payments`
- **THEN** its linked open-backlog stories stay bright, the hint names `payments`, and Open in Editor and Link are disabled

#### Scenario: Remove an arrow to another backlog
- **WHEN** the user selects the arrow from `B1-IAM-0004` to the dashed node `B3-BIL-0002` and presses Remove dependency
- **THEN** `B1-IAM-0004` no longer depends on `B3-BIL-0002`, the change is saved, and the dashed node disappears if nothing else links to it

#### Scenario: Arrow from another backlog cannot be removed
- **WHEN** the user selects the arrow from the dashed node `B2-REP-0002` to `B1-IAM-0004`
- **THEN** Remove dependency is disabled and the hint says the link is stored in `reporting`

#### Scenario: Link dropped on a dashed node
- **WHEN** the user drags a link from an open-backlog story onto a dashed node
- **THEN** no link is added and a note says a link to another backlog is added in the Editor

### Requirement: Other backlogs at the Features and Epics levels
At the Features and Epics levels, each other backlog that the open backlog has a link with SHALL be drawn as one dashed node named after the backlog, showing how many of its stories are linked. Arrows SHALL join it to the open backlog's groups and carry the number of story links, as between groups.

#### Scenario: Epic depends on another backlog
- **WHEN** two stories of Epic "Billing" in `core` depend on stories of `payments`
- **THEN** at the Epics level an arrow labelled 2 runs from "Billing" to a dashed node `payments`

#### Scenario: Story links behind the arrow
- **WHEN** the user selects that arrow
- **THEN** the two story links are listed, the `core` stories as buttons that open them and the `payments` stories by ID, Title and backlog name

### Requirement: Backlogs level
The Graph tab SHALL offer a Backlogs level. Each backlog of the data folder that has a link with another backlog SHALL be one node, showing its name and initials, with the open backlog marked. An arrow SHALL run from a backlog to each backlog it depends on, labelled with the number of story links. Selecting a node or an arrow SHALL list the story links behind it. The level SHALL be read-only.

#### Scenario: Linked backlogs
- **WHEN** two stories of `reporting` depend on stories of `core`, and one story of `core` depends on a story of `payments`
- **THEN** the Backlogs level shows `reporting`, `core` and `payments`, an arrow labelled 2 from `reporting` to `core` and an arrow labelled 1 from `core` to `payments`

#### Scenario: Links between two other backlogs
- **WHEN** `core` is open and a story of `reporting` depends on a story of `payments`
- **THEN** the Backlogs level shows the arrow from `reporting` to `payments`

#### Scenario: Backlog without links to others
- **WHEN** a backlog has no link with another backlog
- **THEN** it is listed under "No dependencies" with its story count

#### Scenario: Backlogs depend on each other
- **WHEN** a story of `core` depends on a story of `payments` and another story of `payments` depends on another story of `core`
- **THEN** both arrows are shown with a note that `core` and `payments` depend on each other, and no cycle warning

### Requirement: A cycle across backlogs is shown
At the Stories level, a cycle formed by the open backlog's links with a story of another backlog SHALL be reported as a dependency cycle, as a cycle inside the backlog is.

#### Scenario: Cycle through another backlog
- **WHEN** `B1-IAM-0001` of `core` depends on `B3-BIL-0002` of `payments`, and `B3-BIL-0002` depends on `B1-IAM-0001`
- **THEN** with `core` open, the graph draws both arrows, marks the cycle, and the cycle note is shown

### Requirement: The graph names a backlog it cannot read
When another backlog of the data folder cannot be read, the Graph tab SHALL say which, because its dashed nodes, arrows and Backlogs-level links are then missing. The links of the open backlog to that backlog SHALL NOT be listed as stories that do not exist.

#### Scenario: Backlog cannot be read
- **WHEN** `payments`' story file is missing or locked while `core` is open
- **THEN** a note under the graph says `payments` could not be read and its links are not shown
