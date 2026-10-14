## ADDED Requirements

### Requirement: Lock a story
Each story SHALL have a lock, stored in the `Locked` column of the backlog CSV as `Yes` (locked) or empty (unlocked). A locked story is reference only: it is not submitted for review and its position is fixed. The story form SHALL offer a lock toggle. A story without an ID (blank Epic) SHALL NOT be lockable and the toggle SHALL be disabled for it with a hint that it needs an Epic. A locked story SHALL be marked as locked in the story list and the Stories tab.

A locked story SHALL NOT be draggable (see "Reorder stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability) and SHALL NOT be deleted: Alt+D and the delete button SHALL do nothing for it and the user SHALL be told to unlock it first. Only its **Epic** field SHALL be read-only; Feature, Title, User Story, Sprint points, Priority, Depends On, Acceptance Criteria and Notes SHALL stay editable, as SHALL the dependencies of other stories on it. Ctrl+Up/Down SHALL select a locked story like any other. Applying a review suggestion to a locked story is covered by the `backlog-review-suggestions` capability.

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
- **WHEN** the user presses Alt+D or clicks delete on a locked story
- **THEN** the story is not deleted and a message says to unlock it first

### Requirement: Lock and unlock selected stories
When at least one story is selected in the Stories tab, the bulk edit bar area SHALL offer **Lock selected** and **Unlock selected**. Lock selected SHALL lock every selected story that has an ID and skip the others; when any were skipped the tool SHALL say how many ("n skipped (no ID)"). Unlock selected SHALL unlock every selected locked story. Both SHALL save through the normal auto-save, keep the selection, and SHALL NOT change any other field or any ID.

#### Scenario: Lock several
- **WHEN** five stories are selected, four have an ID, and the user clicks Lock selected
- **THEN** the four are locked and the message says 1 was skipped (no ID)

#### Scenario: Unlock several
- **WHEN** the user clicks Unlock selected with three locked stories selected
- **THEN** all three are unlocked and the selection is kept

## MODIFIED Requirements

### Requirement: CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, Acceptance Criteria, Notes, Locked`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As a <as a>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Locked` SHALL hold `Yes` for a locked story and be empty otherwise. Any other value SHALL be read as unlocked.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title` or `Locked` column SHALL be accepted and the columns added to it when it is saved. The tool SHALL NOT translate older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As a "team lead", I want "to export a backlog", so that "I can share it"
- **THEN** the `User Story` cell contains `As a team lead, I want to export a backlog, so that I can share it`

#### Scenario: Multiple criteria in one cell
- **WHEN** a story has two criteria
- **THEN** the `Acceptance Criteria` cell contains two lines beginning `AC1: Given ` and `AC2: Given `, separated by a line break

#### Scenario: Round trip
- **WHEN** a story containing commas, quotes and a line break in its text is saved and the file is reloaded
- **THEN** every field is identical to what was entered

#### Scenario: Story with no criteria
- **WHEN** a story has no criteria text
- **THEN** its `Acceptance Criteria` cell is empty

#### Scenario: ID and dependencies saved
- **WHEN** story `IAM-0003` depends on `IAM-0001` and `DD-0002`
- **THEN** its row has `IAM-0003` in `ID` and `IAM-0001;DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On`, `Title` and `Locked` columns is opened and saved
- **THEN** the saved file has all four columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

#### Scenario: Lock saved and reloaded
- **WHEN** a locked story is saved and the file is reloaded
- **THEN** the story is still locked

### Requirement: Story IDs follow position
Every story with a non-blank Epic SHALL have an ID of the form `<PREFIX>-<NNNN>`, stored in the `ID` column, where `<NNNN>` is four digits. The prefix SHALL be the uppercased initials of the words of the story's Epic, ignoring `&` and other punctuation (`Identity & Access Management` gives `IAM`, `Data Delivery` gives `DD`). For an unlocked story the number SHALL be the lowest number, counting from 1, that no locked story of the same prefix holds, taken in the order of the backlog's rows among the unlocked stories with the same Epic. If the prefixes of two different Epics are equal, the Epic that occurs first in the backlog SHALL keep the prefix and each later one SHALL be lengthened by appending letters from the first word of its Epic (second letter, then third, and so on) until it is unique (`DD` in use, `Digital Dashboards` becomes `DDI`). A story with a blank Epic SHALL have no ID.

A **locked** story SHALL keep its ID: recomputing SHALL NOT change it, and its number SHALL NOT be given to another story. Numbers may therefore have gaps. The prefix of a locked story's ID SHALL stay reserved for its Epic so that no two stories ever share an ID, including when two Epics have equal initials.

The ID is not fixed for unlocked stories: the tool SHALL recompute their IDs whenever a story is added, deleted, reordered or moved to another Epic, when an Epic is committed, and when a backlog is loaded. New stories SHALL be placed after the other stories of their Epic. Whenever recomputing changes a story's ID, every `Depends On` entry in the backlog that referred to the old ID SHALL be rewritten to the new ID, so each link keeps pointing at the same story. The ID SHALL be shown on the story form as read-only text and SHALL NOT be editable.

An Epic SHALL count as committed when the Epic field loses focus or a suggestion is chosen; while the user is typing in it the story's ID SHALL NOT change.

#### Scenario: ID from epic and position
- **WHEN** the epic "Identity & Access Management" has three stories
- **THEN** their IDs are `IAM-0001`, `IAM-0002` and `IAM-0003` in row order

#### Scenario: New story goes to the bottom
- **WHEN** a fourth story is committed to that epic
- **THEN** it becomes `IAM-0004` and the other IDs are unchanged

#### Scenario: Not changed while typing
- **WHEN** the user is typing a new Epic into a story and has not left the field
- **THEN** the story's ID has not changed yet

#### Scenario: Prefix collision lengthens the later epic
- **WHEN** epic "Data Delivery" occurs before epic "Digital Dashboards"
- **THEN** the first epic's IDs start `DD-` and the second's start `DDI-`

#### Scenario: Blank epic has no ID
- **WHEN** a story has a blank Epic
- **THEN** its ID is blank and no other story can depend on it

#### Scenario: Delete closes the gap
- **WHEN** `IAM-0002` of three unlocked IAM stories is deleted
- **THEN** the former `IAM-0003` becomes `IAM-0002` and dependencies on it name `IAM-0002`

#### Scenario: Move to another epic
- **WHEN** story `IAM-0002` is moved to the epic "Data Delivery" and `DD-0001` is its last story, and another story depends on `IAM-0002`
- **THEN** the moved story becomes `DD-0002`, the former `IAM-0003` becomes `IAM-0002`, and each dependency names the same story as before

#### Scenario: Swapped IDs keep links
- **WHEN** `IAM-0001` and `IAM-0002` swap places and a third story depended on `IAM-0001`
- **THEN** the third story now depends on `IAM-0002`, which is the same story as before

#### Scenario: ID is read-only
- **WHEN** the user views a story that has an ID
- **THEN** the ID is displayed but cannot be edited

#### Scenario: Old file gets IDs
- **WHEN** a file without an `ID` column and with three stories in epic "Billing & Invoicing" is opened
- **THEN** the stories show `BI-0001` to `BI-0003` in file order, the file is saved with an `ID` column, and its other columns and their order are preserved

#### Scenario: Rows reordered in Excel
- **WHEN** a file's rows were reordered outside the tool so the `ID` values no longer match the positions
- **THEN** on load the IDs of unlocked stories follow the new positions and dependencies are rewritten to name the same stories

#### Scenario: Locked story keeps its ID when a story above is deleted
- **WHEN** `IAM-0002` is locked and the unlocked `IAM-0001` is deleted
- **THEN** the locked story is still `IAM-0002`

#### Scenario: Unlocked stories number around a locked one
- **WHEN** `IAM-0002` is locked and a new story is added to the epic after the unlocked `IAM-0001` and `IAM-0003`
- **THEN** the new story is `IAM-0004`, and if `IAM-0001` is then deleted the remaining unlocked stories become `IAM-0001` and `IAM-0003`

#### Scenario: Equal initials never share an ID
- **WHEN** a locked story holds `DD-0001` and its epic is "Data Delivery", and another epic "Digital Dashboards" exists
- **THEN** the second epic's stories are numbered `DDI-` and no story other than the locked one has `DD-0001`

#### Scenario: Links to a locked story survive
- **WHEN** an unlocked story depends on the locked `IAM-0002` and stories above it are deleted
- **THEN** the dependency still names `IAM-0002`

### Requirement: Reorder stories by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an unlocked story and drop it between two stories of an Epic group, above the first or below the last. A locked story SHALL NOT be draggable. Other stories MAY be dropped between or around locked stories; a locked story keeps its ID wherever the stories around it land. Dropping within the story's own group SHALL reorder it. Dropping into another Epic's group SHALL set the story's Epic to that group's Epic and place it at the dropped position. Dropping onto the "(No epic)" group SHALL have no effect. A drop SHALL show where the story will land while dragging, SHALL keep the story selected, and SHALL be saved through the normal auto-save. Reordering within a group SHALL change the saved order of that group's rows only and SHALL NOT move the rows of other Epics or change the order of the groups. IDs and dependencies SHALL be updated as described in "Story IDs follow position".

#### Scenario: Reorder within an epic
- **WHEN** the user drags the third story of "Billing" above the first and none is locked
- **THEN** it is listed first in the group, its ID becomes `...-0001`, the other two become `-0002` and `-0003`, and the CSV rows of the group are in the new order

#### Scenario: Move to another epic
- **WHEN** the user drags a story from "Billing" and drops it between the first and second stories of "Onboarding"
- **THEN** its Epic is "Onboarding", it is listed second in that group with the next free number of that group, and the unlocked stories after it are renumbered

#### Scenario: Drop at the end
- **WHEN** the user drops a story below the last story of a group
- **THEN** it becomes the last story of that group

#### Scenario: Other rows untouched
- **WHEN** a story is reordered within its group
- **THEN** the rows of other Epics keep their positions in the saved file and the groups keep their order

#### Scenario: Drop on no epic
- **WHEN** the user drops a story on the "(No epic)" group
- **THEN** nothing changes

#### Scenario: Selection kept
- **WHEN** the selected story is dragged to a new place
- **THEN** it is still the selected story and the form still shows it

#### Scenario: Dropped where it started
- **WHEN** a story is dropped at its own position
- **THEN** nothing changes and nothing is saved

#### Scenario: Locked story cannot be dragged
- **WHEN** the user tries to drag a locked story
- **THEN** it does not move

#### Scenario: Dropped next to a locked story
- **WHEN** an unlocked story is dropped above the locked `IAM-0002`
- **THEN** the locked story keeps `IAM-0002` and the dropped story takes the lowest free number

### Requirement: Bulk edit selected stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Feature text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. An Epic change SHALL skip locked stories, and the confirmation SHALL say how many were skipped. On confirmation the tool SHALL set only the chosen fields on every selected story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs follow position", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. Priority and Feature changes SHALL apply to locked stories as well. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Feature are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Feature are unchanged

#### Scenario: Change epic
- **WHEN** 4 unlocked stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Feature and Title are unchanged, and the list shows them under "Billing"

#### Scenario: Change epic renumbers
- **WHEN** 2 stories `IAM-0001` and `IAM-0002` are moved to epic "Billing & Invoicing", which already has 3 stories, and a third story depends on `IAM-0001`
- **THEN** the two stories become `BI-0004` and `BI-0005` in their previous order, the remaining IAM stories are renumbered from `IAM-0001`, and the third story's dependency names `BI-0004`

#### Scenario: Confirmation mentions new IDs
- **WHEN** the user clicks Apply with an Epic that differs from the selected stories' current Epics
- **THEN** the confirmation states that the affected stories will receive new IDs

#### Scenario: Change capability
- **WHEN** stories from two different epics are selected and Feature is set to "Invoices"
- **THEN** after confirming, all selected stories have Feature "Invoices" and their IDs are unchanged

#### Scenario: Clear priority
- **WHEN** Priority is set to "None" and applied with confirmation
- **THEN** the selected stories have an empty Priority

#### Scenario: Several fields at once
- **WHEN** Priority High and Epic "Billing" are both set and confirmed
- **THEN** both are applied to every selected unlocked story, and Priority only to selected locked stories

#### Scenario: Nothing to apply
- **WHEN** stories are selected but Priority is "No change" and Epic and Feature are empty
- **THEN** the Apply button is disabled

#### Scenario: Confirmation
- **WHEN** the user clicks Apply with 12 stories selected and Epic set to "Billing"
- **THEN** a confirmation states that Epic will be set to "Billing" on 12 stories

#### Scenario: Cancelled
- **WHEN** the user cancels the confirmation
- **THEN** no story changes and nothing is saved

#### Scenario: Saved
- **WHEN** a bulk edit is confirmed
- **THEN** the save status shows saving and then saved, and the CSV contains the new values

#### Scenario: No selection
- **WHEN** no story is selected
- **THEN** the bulk edit bar is not shown

#### Scenario: Locked stories skipped for Epic
- **WHEN** 5 stories are selected, 2 are locked, and Epic is set to "Billing" and confirmed
- **THEN** the 3 unlocked stories move to "Billing", the locked ones keep their Epic and ID, and the confirmation said 2 were skipped
