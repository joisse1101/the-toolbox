## ADDED Requirements
### Requirement: Frozen stories are read-only
A story is **frozen** when its `Frozen` cell holds `Yes`. Only `jois-story-plan` freezes stories (see the `frozen-stories` capability); the portal SHALL offer no way to freeze or unfreeze a story: no toggle on the story form, no button on an Epic or Feature header, no bulk action in the Stories tab and no keyboard shortcut. A frozen story SHALL be marked as frozen on its row in the story list, on its row in the Stories tab and on its form.

The form of a frozen story SHALL show every field read-only: Epic, Feature, Title, As a, I want, So that, Sprint points, Priority, its own Depends On, the acceptance criteria, Notes and Clarifications. The form SHALL say that the story is frozen because it is part of a slice, and that a change to it is made by a new story that supersedes it. The Depends On entries of other stories that name a frozen story SHALL stay editable, and a frozen story SHALL be offered in the Depends on picker of other stories like any other story. Ctrl+Up/Down SHALL select a frozen story like any other.

A frozen story SHALL NOT be draggable (see "Reorder unfrozen stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability) and SHALL NOT be deleted: Alt+D SHALL do nothing for it and the user SHALL be told that a frozen story cannot be deleted, the Delete story button SHALL be disabled for it with the hint "A frozen story cannot be deleted", and Delete selected and Bulk edit SHALL skip it (see "Delete selected unfrozen stories" and "Bulk edit selected stories"). Applying a review suggestion to a frozen story is covered by the `backlog-review-suggestions` capability.

#### Scenario: Form of a frozen story
- **WHEN** the user opens a frozen story in the Editor tab
- **THEN** the form is marked frozen, every field is read-only, and a note says a change is made by a superseding story

#### Scenario: No freeze or unfreeze control
- **WHEN** the user looks at the story form, an Epic header, a Feature header and the bulk bar of the Stories tab
- **THEN** none of them offers to freeze, unfreeze or lock a story

#### Scenario: Marked in the lists
- **WHEN** a frozen story is listed in the Editor tab and in the Stories tab
- **THEN** both rows show it as frozen

#### Scenario: Dependency on a frozen story stays editable
- **WHEN** the user adds the frozen story `B1-IAM-0002` to the Depends on list of the unfrozen story `B1-IAM-0005`
- **THEN** the change is made and saved, and `B1-IAM-0002` is unchanged

#### Scenario: Cannot be dragged
- **WHEN** the user tries to drag a frozen story
- **THEN** it does not move

#### Scenario: Cannot be deleted
- **WHEN** the user presses Alt+D on a frozen story
- **THEN** the story is not deleted and a message says a frozen story cannot be deleted

#### Scenario: Delete story disabled
- **WHEN** a frozen story is open in the Editor tab
- **THEN** the Delete story button is disabled and its hint says a frozen story cannot be deleted

### Requirement: Story IDs carry initials, epic prefix and number
Every story with a non-blank Epic SHALL have an ID of the form `<INITIALS>-<PREFIX>-<NNNN>`, stored whole in the `ID` column, where `<NNNN>` is four digits. `<INITIALS>` SHALL be the initials of the backlog the story is in (see the `backlog-initials` capability); they hold no hyphen, so the parts of an ID can be told apart. `<PREFIX>` SHALL be the uppercased initials of the words of the story's Epic, ignoring `&` and other punctuation (`Identity & Access Management` gives `IAM`, `Data Delivery` gives `DD`), as fixed below. A story with a blank Epic SHALL have no ID. For an unfrozen story the number SHALL be the lowest number, counting from 1, that no frozen story with the same initials and prefix holds, taken in the order of the backlog's rows among the unfrozen stories with the same Epic.

The prefix of an Epic SHALL be fixed from its first frozen story: from then on every story of that Epic, frozen or not, uses that prefix, whatever the order of the Epics. For the Epics that hold no fixed prefix, if the initials of two different Epics are equal, the Epic that occurs first in the backlog SHALL keep the prefix and each later one SHALL take the prefix with the next free digit appended (`DD` in use, `Digital Dashboards` becomes `DD1`, a third Epic with those initials becomes `DD2`); a prefix that another Epic already holds SHALL be skipped.

A **frozen** story SHALL keep its ID: recomputing SHALL NOT change it, and its number SHALL NOT be given to another story, now or later, because a frozen story is never deleted. Numbers may therefore have gaps.

The ID is not fixed for unfrozen stories: the tool SHALL recompute their IDs whenever a story is added, deleted, reordered or moved to another Epic, when an Epic is committed, when the backlog's initials change, and when a backlog is loaded. An ID that lacks the backlog's initials, as in an older file (`IAM-0003`), SHALL gain them when the backlog is loaded (`B1-IAM-0003`). New stories SHALL be placed after the other stories of their Epic. Whenever recomputing changes a story's ID, every `Depends On` entry in the backlog that referred to the old ID SHALL be rewritten to the new ID, so each link keeps pointing at the same story. The ID SHALL be shown on the story form as read-only text and SHALL NOT be editable.

An Epic SHALL count as committed when the Epic field loses focus or a suggestion is chosen; while the user is typing in it the story's ID SHALL NOT change.

#### Scenario: ID from initials, epic and position
- **WHEN** the backlog's initials are `B1` and the epic "Identity & Access Management" has three stories
- **THEN** their IDs are `B1-IAM-0001`, `B1-IAM-0002` and `B1-IAM-0003` in row order

#### Scenario: New story goes to the bottom
- **WHEN** a fourth story is committed to that epic
- **THEN** it becomes `B1-IAM-0004` and the other IDs are unchanged

#### Scenario: Not changed while typing
- **WHEN** the user is typing a new Epic into a story and has not left the field
- **THEN** the story's ID has not changed yet

#### Scenario: Equal epic initials get a digit
- **WHEN** epic "Data Delivery" occurs before epic "Digital Dashboards" and none of their stories is frozen
- **THEN** the first epic's IDs start `B1-DD-` and the second's start `B1-DD1-`

#### Scenario: A third epic with the same initials
- **WHEN** epic "Dynamic Dashboards" occurs after those two epics
- **THEN** its IDs start `B1-DD2-`

#### Scenario: Blank epic has no ID
- **WHEN** a story has a blank Epic
- **THEN** its ID is blank and no other story can depend on it

#### Scenario: Delete closes the gap
- **WHEN** `B1-IAM-0002` of three unfrozen IAM stories is deleted
- **THEN** the former `B1-IAM-0003` becomes `B1-IAM-0002` and dependencies on it name `B1-IAM-0002`

#### Scenario: Move to another epic
- **WHEN** story `B1-IAM-0002` is moved to the epic "Data Delivery" and `B1-DD-0001` is its last story, and another story depends on `B1-IAM-0002`
- **THEN** the moved story becomes `B1-DD-0002`, the former `B1-IAM-0003` becomes `B1-IAM-0002`, and each dependency names the same story as before

#### Scenario: Swapped IDs keep links
- **WHEN** `B1-IAM-0001` and `B1-IAM-0002` swap places and a third story depended on `B1-IAM-0001`
- **THEN** the third story now depends on `B1-IAM-0002`, which is the same story as before

#### Scenario: Older IDs gain the initials on load
- **WHEN** a file whose stories have the IDs `IAM-0001` and `IAM-0002`, the second depending on the first, is loaded in a backlog with the initials `B1`
- **THEN** the stories become `B1-IAM-0001` and `B1-IAM-0002` and the dependency names `B1-IAM-0001`

#### Scenario: Frozen story keeps its ID
- **WHEN** `B1-IAM-0002` is frozen and an unfrozen story is dropped above it
- **THEN** the frozen story is still `B1-IAM-0002` and the dropped story takes the lowest free number

#### Scenario: Frozen number is not reused
- **WHEN** `B1-IAM-0001` to `B1-IAM-0003` are frozen and a new story is added to the epic
- **THEN** the new story becomes `B1-IAM-0004`

#### Scenario: Prefix stays once frozen
- **WHEN** "Data Delivery" holds the frozen story `B1-DD-0001`, "Digital Dashboards" holds `B1-DD1-0001`, and the user drops "Digital Dashboards" above "Data Delivery"
- **THEN** each epic keeps its prefix and the frozen story is still `B1-DD-0001`

### Requirement: Renumber unfrozen stories in the displayed order
Beside the Add story button in the story panel of the Editor tab there SHALL be a Renumber button. Pressing it SHALL make the file order match what the panel shows within each Epic, by gathering the rows of each Feature into one block in the order the features are shown, and then renumber the stories as described in "Story IDs carry initials, epic prefix and number". Rows of other Epics SHALL keep their positions. A frozen story SHALL keep its ID, and its Epic SHALL keep the prefix of that ID. Before changing anything the button SHALL ask the user to confirm, saying how many stories get a new ID. The button SHALL be disabled, with a tooltip saying why, when pressing it would change no row and no ID. Open review suggestions of a story whose ID changes SHALL follow the story to its new ID. The change SHALL be saved through the normal auto-save and the selected story SHALL stay selected.

#### Scenario: Suggestions follow Renumber
- **WHEN** the story `B1-BI-0003` has an open review suggestion and Renumber gives it the ID `B1-BI-0002`
- **THEN** the suggestion is shown on that story, now listed under `B1-BI-0002`, and no suggestion is reported as no longer matching a story

#### Scenario: Interleaved features are gathered
- **WHEN** the rows of "Billing" are Pay, Refund, Pay and the user presses Renumber and confirms
- **THEN** the rows become Pay, Pay, Refund and the stories are numbered `B1-BI-0001` to `B1-BI-0003` in the order the panel shows them

#### Scenario: Frozen story kept
- **WHEN** `B1-BI-0002` is frozen and the user presses Renumber and confirms
- **THEN** it is still `B1-BI-0002` and the unfrozen stories of its Epic take the lowest free numbers around it

#### Scenario: Links follow
- **WHEN** a story depends on `B1-BI-0003` and Renumber gives that story the ID `B1-BI-0002`
- **THEN** the dependency now names `B1-BI-0002`

#### Scenario: Declined
- **WHEN** the user presses Renumber and cancels the confirmation
- **THEN** nothing changes and nothing is saved

#### Scenario: Nothing to renumber
- **WHEN** every Feature's rows are already together and every ID already follows position
- **THEN** the Renumber button is disabled and its tooltip says the IDs already follow the order shown

#### Scenario: Other epics untouched
- **WHEN** Renumber gathers the features of "Billing"
- **THEN** the rows of other Epics keep their positions in the saved file

### Requirement: Reorder unfrozen stories by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an unfrozen story and drop it between two stories of an Epic group, above the first or below the last. A frozen story SHALL NOT be draggable. Other stories MAY be dropped between or around frozen stories; a frozen story keeps its ID wherever the stories around it land. Dropping within the story's own group SHALL reorder it. Dropping into another Epic's group SHALL set the story's Epic to that group's Epic and place it at the dropped position. Dropping onto the "(No epic)" group SHALL have no effect. A drop SHALL show where the story will land while dragging, SHALL keep the story selected, and SHALL be saved through the normal auto-save. Reordering within a group SHALL change the saved order of that group's rows only and SHALL NOT move the rows of other Epics or change the order of the groups. IDs and dependencies SHALL be updated as described in "Story IDs carry initials, epic prefix and number". Open review suggestions of a story whose ID changes SHALL follow the story to its new ID.

#### Scenario: Reorder within an epic
- **WHEN** the user drags the third story of "Billing" above the first and none is frozen
- **THEN** it is listed first in the group, its ID becomes `...-0001`, the other two become `-0002` and `-0003`, and the CSV rows of the group are in the new order

#### Scenario: Move to another epic
- **WHEN** the user drags a story from "Billing" and drops it between the first and second stories of "Onboarding"
- **THEN** its Epic is "Onboarding", it is listed second in that group with the next free number of that group, and the unfrozen stories after it are renumbered

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

#### Scenario: Frozen story cannot be dragged
- **WHEN** the user tries to drag a frozen story
- **THEN** it does not move

#### Scenario: Dropped next to a frozen story
- **WHEN** an unfrozen story is dropped above the frozen `B1-IAM-0002`
- **THEN** the frozen story keeps `B1-IAM-0002` and the dropped story takes the lowest free number

#### Scenario: Suggestions follow a dragged story
- **WHEN** the story `B1-IAM-0002` has an open review suggestion and dragging another story above it gives it the ID `B1-IAM-0003`
- **THEN** the suggestion is shown on that story, now listed under `B1-IAM-0003`, and no suggestion is reported as no longer matching a story

### Requirement: Move groups by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an Epic head or a Feature head, expanded or collapsed, and drop it between two groups of the same level. An Epic SHALL be dropped between epics, above the first or below the last. A Feature SHALL be dropped only among the features of its own Epic, above the first or below the last. The whole group SHALL move as one block: all its stories keep their relative order and sit together at the new place. The "(No epic)" group SHALL NOT be draggable, and dropping a Feature onto another Epic SHALL have no effect. A frozen story moves with its group and keeps its ID. While dragging, the panel SHALL show a drop line above or below the row where the group will land, in the style used for dragging a single story. The dragged group's stories SHALL stay as they are in the file apart from this move, and the selected story SHALL stay selected. The change SHALL be saved through the normal auto-save, and IDs and dependencies SHALL be updated as described in "Story IDs carry initials, epic prefix and number". Open review suggestions of a story whose ID changes SHALL follow the story to its new ID.

#### Scenario: Suggestions follow a moved group
- **WHEN** the story `B1-BI-0003` has an open review suggestion and moving its feature gives it the ID `B1-BI-0001`
- **THEN** the suggestion is shown on that story as before, now listed under `B1-BI-0001`, and it is saved with the review file

#### Scenario: Move a feature within its epic
- **WHEN** "Billing" lists the features Pay, Refund and Invoice, and the user drops Invoice above Pay
- **THEN** the panel lists Invoice, Pay, Refund; the stories of Invoice come first in the epic's rows of the saved file, and the epic's stories are numbered `...-0001` onward in that order

#### Scenario: Move a collapsed epic
- **WHEN** the epic "Onboarding" is collapsed and the user drops it above "Billing"
- **THEN** all stories of Onboarding appear before those of Billing, in their previous order, and the groups are shown in the new order

#### Scenario: Feature stays in its epic
- **WHEN** the user drops the feature Pay of "Billing" on the group "Onboarding"
- **THEN** nothing changes and nothing is saved

#### Scenario: No epic cannot be dragged
- **WHEN** the user tries to drag the "(No epic)" head
- **THEN** it does not move

#### Scenario: Other rows untouched by a feature move
- **WHEN** a feature is moved inside its epic
- **THEN** the rows of other Epics keep their positions in the saved file

#### Scenario: Frozen story moves with its group
- **WHEN** the feature Pay holds the frozen story `B1-BI-0002` and the feature is dropped below Refund
- **THEN** the frozen story is still `B1-BI-0002`, and the unfrozen stories take the lowest free numbers in the new order

#### Scenario: Epic order changes a shared prefix
- **WHEN** "Data Delivery" and "Digital Dashboards" both start with `DD`, none of their stories is frozen, and the user drops the second above the first
- **THEN** the stories of "Digital Dashboards" are numbered `B1-DD-` and those of "Data Delivery" `B1-DD1-`, and `Depends On` links follow their stories

#### Scenario: Epic order keeps a fixed prefix
- **WHEN** "Data Delivery" holds a frozen story `B1-DD-0001` and the user drops "Digital Dashboards", whose prefix is `DD1`, above it
- **THEN** both epics keep their prefixes and the frozen story is still `B1-DD-0001`

#### Scenario: Dropped where it started
- **WHEN** a group is dropped at its own position
- **THEN** nothing changes and nothing is saved

### Requirement: Delete selected unfrozen stories
When at least one story is selected in the Stories tab, the bulk bar SHALL offer **Delete selected (N)**, N being the number of selected stories. It SHALL ask for confirmation naming how many stories will be deleted before changing anything. Deleting SHALL apply to every selected story, hidden ones included, except frozen stories, which SHALL be skipped and kept. Deleted stories SHALL have their IDs removed from the `Depends On` of the stories that remain, and the remaining stories SHALL be renumbered once as described in "Story IDs carry initials, epic prefix and number". When any frozen story was skipped the tool SHALL say how many ("n frozen stories were kept"). The deleted stories SHALL leave the selection, the remaining selection SHALL be kept, and the change SHALL save through the normal auto-save. If every selected story is frozen, nothing SHALL be deleted and the tool SHALL say so.

#### Scenario: Delete several
- **WHEN** four unfrozen stories are selected and the user clicks Delete selected (4) and confirms
- **THEN** the four are removed, the remaining stories are renumbered, and the selection is empty

#### Scenario: Cancel
- **WHEN** the user cancels the confirmation
- **THEN** no story is deleted and the selection is kept

#### Scenario: Frozen stories are skipped
- **WHEN** five stories are selected, two are frozen, and the user deletes and confirms
- **THEN** the three unfrozen stories are deleted, the two frozen ones remain and stay selected, and the message says 2 frozen stories were kept

#### Scenario: Only frozen stories selected
- **WHEN** every selected story is frozen and the user clicks Delete selected
- **THEN** nothing is deleted and the message says the selected stories are frozen

### Requirement: Bulk edit selected unfrozen stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with a Priority dropdown, an Epic text field and a Feature text field. The Priority dropdown SHALL default to "No change" and offer "None", Critical, High, Medium and Low. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the three is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. A bulk edit SHALL skip frozen stories whatever the field, because every field of a frozen story is read-only, and the confirmation SHALL say how many were skipped. On confirmation the tool SHALL set only the chosen fields on every selected unfrozen story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs carry initials, epic prefix and number", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If every selected story is frozen, nothing SHALL change and the tool SHALL say so. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected, Priority is set to High, Epic and Feature are empty, and the user applies and confirms
- **THEN** all 10 stories have Priority High and their Epic and Feature are unchanged

#### Scenario: Change epic
- **WHEN** 4 unfrozen stories are selected, Epic is set to "Billing", and the user applies and confirms
- **THEN** those 4 stories have Epic "Billing", their Feature and Title are unchanged, and the list shows them under "Billing"

#### Scenario: Change epic renumbers
- **WHEN** 2 stories `B1-IAM-0001` and `B1-IAM-0002` are moved to epic "Billing & Invoicing", which already has 3 stories, and a third story depends on `B1-IAM-0001`
- **THEN** the two stories become `B1-BI-0004` and `B1-BI-0005` in their previous order, the remaining IAM stories are renumbered from `B1-IAM-0001`, and the third story's dependency names `B1-BI-0004`

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
- **THEN** both are applied to every selected unfrozen story

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

#### Scenario: Frozen stories skipped
- **WHEN** 5 stories are selected, 2 are frozen, and Priority is set to High and confirmed
- **THEN** the 3 unfrozen stories get Priority High, the frozen ones are unchanged, and the confirmation said 2 were skipped

#### Scenario: Only frozen stories selected
- **WHEN** every selected story is frozen and the user clicks Apply
- **THEN** no story changes and the message says the selected stories are frozen

### Requirement: Story CSV format
Each story SHALL be stored as one row with exactly these columns: `ID, Epic, Feature, Title, User Story, Sprint points, Priority, Depends On, User Acceptance Criteria, Notes, Frozen, Clarifications`.

- `ID` SHALL hold the story ID, or be empty when the story has none.
- `Title` SHALL hold the title of the user story.
- `User Story` SHALL hold one sentence in the form `As <as>, I want <i want>, so that <so that>`.
- `Depends On` SHALL hold the IDs of the stories this story depends on, separated by semicolons, or be empty.
- `User Acceptance Criteria` SHALL hold one line per criterion, lines separated by a line break within the cell, each in the form `AC<n>: Given <given>, when <when>, then <then>`, where `<n>` is the criterion's position starting at 1.
- `Frozen` SHALL hold `Yes` for a frozen story and be empty otherwise. Any other value SHALL be read as unfrozen.
- `Clarifications` SHALL hold the story's question and answer pairs in the form defined by the `story-clarifications` capability, or be empty.

Values containing commas, quotes or line breaks SHALL be correctly quoted so the file round-trips and opens correctly in Excel. A file that lacks the `ID`, `Depends On`, `Title`, `Frozen` or `Clarifications` column SHALL be accepted and the columns added to it when it is saved. An older `Locked` column SHALL be ignored, never read as frozen, and SHALL NOT be written when the file is saved. The tool SHALL NOT translate other older column names: a `Capability` column SHALL be treated as an unknown column and kept unchanged.

#### Scenario: Story sentence saved
- **WHEN** the user enters As "a team lead", I want "to export a backlog", so that "I can share it"
- **THEN** the `User Story` cell contains `As a team lead, I want to export a backlog, so that I can share it`

#### Scenario: Multiple criteria in one cell
- **WHEN** a story has two criteria
- **THEN** the `User Acceptance Criteria` cell contains two lines beginning `AC1: Given ` and `AC2: Given `, separated by a line break

#### Scenario: Round trip
- **WHEN** a story containing commas, quotes and a line break in its text is saved and the file is reloaded
- **THEN** every field is identical to what was entered

#### Scenario: Story with no criteria
- **WHEN** a story has no criteria text
- **THEN** its `User Acceptance Criteria` cell is empty

#### Scenario: ID and dependencies saved
- **WHEN** story `B1-IAM-0003` depends on `B1-IAM-0001` and `B1-DD-0002`
- **THEN** its row has `B1-IAM-0003` in `ID` and `B1-IAM-0001;B1-DD-0002` in `Depends On`

#### Scenario: Columns added on save
- **WHEN** a file without `ID`, `Depends On`, `Title`, `Frozen` and `Clarifications` columns is opened and saved
- **THEN** the saved file has all five columns and every other column keeps its values

#### Scenario: Title and feature saved
- **WHEN** a story has Feature "Authentication" and Title "Local Login"
- **THEN** its row has `Authentication` in `Feature` and `Local Login` in `Title`

#### Scenario: Old column names are not translated
- **WHEN** a file with a `Capability` column is opened and saved
- **THEN** the `Capability` column and its values are saved unchanged and no value is copied into `Feature` or `Title`

#### Scenario: Old Locked column is dropped
- **WHEN** a file with a `Locked` column holding `Yes` on a story is opened and saved
- **THEN** the story is not frozen, the saved file has no `Locked` column, and every other column keeps its values

#### Scenario: Frozen saved and reloaded
- **WHEN** a frozen story is saved and the file is reloaded
- **THEN** the story is still frozen

#### Scenario: Clarifications saved
- **WHEN** a story with a question and its answer is saved and the file is reloaded
- **THEN** the `Clarifications` cell holds `Q1: ...` and `A1: ...` lines and the story shows the same pair

## MODIFIED Requirements
### Requirement: Multi-select in the Stories tab
Each table row SHALL have a checkbox, and the header SHALL have a select-all checkbox that selects or clears every row shown. Shift-clicking a row's checkbox SHALL select every row shown between it and the last clicked checkbox. The tool SHALL show how many stories are selected. While a search hides some of the selected stories, the tool SHALL also show how many selected stories are hidden. Select-all, shift-click and clearing SHALL act only on the rows shown: they SHALL NOT select or deselect a story the search hides. A bulk edit and Delete selected SHALL apply to all selected stories, hidden ones included. The selection SHALL be separate from the story selected in the Editor tab, and SHALL be cleared when another backlog is opened. Stories removed from the backlog SHALL drop out of the selection.

#### Scenario: Select several
- **WHEN** the user ticks three rows
- **THEN** "3 selected" is shown

#### Scenario: Select all
- **WHEN** the user ticks the header checkbox
- **THEN** every row is selected, and ticking it again clears them all

#### Scenario: Range select
- **WHEN** the user ticks the second row and then shift-clicks the checkbox of the fifth row
- **THEN** rows two to five are all selected

#### Scenario: Selection independent of the editor
- **WHEN** rows are ticked in the Stories tab and the user opens another story in the Editor tab and returns
- **THEN** the same rows are still ticked

#### Scenario: Select all with a search
- **WHEN** a search shows 4 of 12 stories and the user ticks the header checkbox
- **THEN** those 4 stories are selected and the other 8 are not

#### Scenario: Clear with a search keeps hidden ticks
- **WHEN** 2 stories were ticked, a search then shows 4 other stories, and the user ticks and unticks the header checkbox
- **THEN** the 4 shown stories are not selected, and the 2 hidden ones still are

#### Scenario: Range select with a search
- **WHEN** a search shows stories that are not neighbours in the backlog and the user shift-clicks from the first shown row to the last
- **THEN** only the shown rows between them are selected

#### Scenario: Hidden selection is reported
- **WHEN** 3 stories are selected and a search hides 2 of them
- **THEN** the status shows "3 selected" and that 2 of them are hidden by the search

#### Scenario: Bulk edit reaches hidden selected stories
- **WHEN** 3 stories are selected, a search hides 2 of them, and the user applies a Priority to the selection
- **THEN** the confirmation names 3 stories and all 3 get the Priority

## REMOVED Requirements
### Requirement: Lock a story
**Reason**: The lock only guarded a story's position and Epic, so its text could still change and its ID still depended on neighbours. It is replaced by the frozen state, which makes every field read-only (see "Frozen stories are read-only").
**Migration**: A story is frozen only by `jois-story-plan` when it enters a slice (see the `frozen-stories` capability); the portal has no lock, freeze or unfreeze control. An older `Locked` value is ignored and dropped on the next save, so no story starts frozen.

### Requirement: Lock and unlock selected stories
**Reason**: There is no lock to set. Freezing is done by `jois-story-plan`, and the portal never freezes or unfreezes a story.
**Migration**: The bulk bar offers Delete selected and the bulk edit only. Both skip frozen stories.

### Requirement: Lock and unlock a group
**Reason**: There is no lock to set on a group. Freezing is done by `jois-story-plan` for the stories of a slice, and the portal never freezes or unfreezes a story.
**Migration**: Epic and Feature headers no longer carry a lock button or a lock mark. A frozen story is marked on its own row.

### Requirement: Story IDs follow position
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Renumber stories in the displayed order
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Reorder stories by drag and drop
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Reorder groups by drag and drop
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Delete selected stories
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: Bulk edit selected stories
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.

### Requirement: CSV format
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.
