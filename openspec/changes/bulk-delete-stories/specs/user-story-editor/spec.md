## MODIFIED Requirements

### Requirement: Multiple stories per backlog
A backlog file SHALL hold many stories, one per CSV row. The tool SHALL let the user add a story, switch between stories, and delete the selected story. The story list SHALL offer Add only; the delete control for the selected story SHALL be a **Delete story** button in the story form's header row, directly after **Move to Proposed**, and SHALL appear only in the Editor tab's form. Deleting several stories at once is covered by "Delete selected stories". A new story SHALL be appended to the end of the backlog. Deleting a story SHALL remove its ID from the `Depends On` of every other story and renumber the rest of its Epic as described in "Story IDs follow position". In the story list each story SHALL be labelled with its Title, and a story with a blank Title SHALL show "New story". Hovering a story in the list SHALL show a tooltip with the composed user story, followed by any completeness or warning reasons.

#### Scenario: Add story
- **WHEN** the user adds a story
- **THEN** a blank story is appended to the backlog and selected

#### Scenario: Delete removes references
- **WHEN** story `IAM-0001` is deleted and `IAM-0003` depended on it
- **THEN** `IAM-0003` no longer lists `IAM-0001` in its dependencies

#### Scenario: Delete story button beside Move to Proposed
- **WHEN** a story is open in the Editor tab
- **THEN** the form header row shows Delete story right after Move to Proposed, and the story list has no delete button

#### Scenario: Delete story asks first
- **WHEN** the user clicks Delete story and cancels the confirmation
- **THEN** the story is kept

#### Scenario: List label
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its list row reads "Local Login"

#### Scenario: List label with one part
- **WHEN** a story has a Feature "Authentication" but a blank Title
- **THEN** its list row reads "New story"

#### Scenario: Tooltip
- **WHEN** the user hovers a story that is missing its Epic
- **THEN** the tooltip shows the user story text and a line saying Epic is missing

### Requirement: Lock a story
Each story SHALL have a lock, stored in the `Locked` column of the backlog CSV as `Yes` (locked) or empty (unlocked). A locked story is reference only: it is not submitted for review and its position is fixed. The story form SHALL offer a lock toggle. A story without an ID (blank Epic) SHALL NOT be lockable and the toggle SHALL be disabled for it with a hint that it needs an Epic. A locked story SHALL be marked as locked in the story list and the Stories tab.

A locked story SHALL NOT be draggable (see "Reorder stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability) and SHALL NOT be deleted: Alt+D SHALL do nothing for it and the user SHALL be told to unlock it first, the Delete story button SHALL be disabled for it with the hint "Unlock the story first", and Delete selected SHALL skip it (see "Delete selected stories"). Only its **Epic** field SHALL be read-only; Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria and Notes SHALL stay editable, as SHALL the dependencies of other stories on it. Ctrl+Up/Down SHALL select a locked story like any other. Applying a review suggestion to a locked story is covered by the `backlog-review-suggestions` capability.

#### Scenario: Lock a story
- **WHEN** the user turns on the lock for `IAM-0002`
- **THEN** the story is marked locked, the Epic field becomes read-only, and the saved row has `Yes` in `Locked`

#### Scenario: Unlock
- **WHEN** the user turns the lock off
- **THEN** the Epic field is editable again and the saved row has an empty `Locked`

#### Scenario: No ID, no lock
- **WHEN** a story has a blank Epic
- **THEN** the lock toggle is disabled and says the story needs an Epic

#### Scenario: Other fields stay editable
- **WHEN** the user edits the Title, points and dependencies of a locked story
- **THEN** the changes are made and saved

#### Scenario: Cannot be deleted
- **WHEN** the user presses Alt+D on a locked story
- **THEN** the story is not deleted and a message says to unlock it first

#### Scenario: Delete story disabled
- **WHEN** a locked story is open in the Editor tab
- **THEN** the Delete story button is disabled and its hint says to unlock the story first

## ADDED Requirements

### Requirement: Delete selected stories
When at least one story is selected in the Stories tab, the bulk bar SHALL offer **Delete selected (N)**, N being the number of selected stories, next to Lock selected and Unlock selected. It SHALL ask for confirmation naming how many stories will be deleted before changing anything. Deleting SHALL apply to every selected story, hidden ones included, except locked stories, which SHALL be skipped and kept. Deleted stories SHALL have their IDs removed from the `Depends On` of the stories that remain, and the remaining stories SHALL be renumbered once as described in "Story IDs follow position". When any locked story was skipped the tool SHALL say how many ("n locked stories were kept"). The deleted stories SHALL leave the selection, the remaining selection SHALL be kept, and the change SHALL save through the normal auto-save. If every selected story is locked, nothing SHALL be deleted and the tool SHALL say so.

#### Scenario: Delete several
- **WHEN** four unlocked stories are selected and the user clicks Delete selected (4) and confirms
- **THEN** the four are removed, the remaining stories are renumbered, and the selection is empty

#### Scenario: Cancel
- **WHEN** the user cancels the confirmation
- **THEN** no story is deleted and the selection is kept

#### Scenario: Locked stories are skipped
- **WHEN** five stories are selected, two are locked, and the user deletes and confirms
- **THEN** the three unlocked stories are deleted, the two locked ones remain and stay selected, and the message says 2 locked stories were kept

#### Scenario: Links are cleaned
- **WHEN** `IAM-0001` is deleted in bulk and the remaining `IAM-0003` depended on it
- **THEN** `IAM-0003` (renumbered if needed) no longer lists `IAM-0001`

#### Scenario: Nothing selected
- **WHEN** no story is selected in the Stories tab
- **THEN** Delete selected is disabled
