# Spec Delta

## MODIFIED Requirements

### Requirement: Multi-select in the Stories tab
Each table row SHALL have a checkbox, and the header SHALL have a select-all checkbox that selects or clears every row shown. The checkbox of a frozen story SHALL be disabled, and select-all and shift-click SHALL skip frozen stories, so a frozen story is never selected. A story that becomes frozen while selected, for example after a refresh, SHALL drop out of the selection. Shift-clicking a row's checkbox SHALL select every row shown between it and the last clicked checkbox. The tool SHALL show how many stories are selected. While a search hides some of the selected stories, the tool SHALL also show how many selected stories are hidden. Select-all, shift-click and clearing SHALL act only on the rows shown: they SHALL NOT select or deselect a story the search hides. A bulk edit and Delete selected SHALL apply to all selected stories, hidden ones included. The selection SHALL be separate from the story selected in the Editor tab, and SHALL be cleared when another backlog is opened. Stories removed from the backlog SHALL drop out of the selection.

#### Scenario: Select several
- **WHEN** the user ticks three rows
- **THEN** "3 selected" is shown

#### Scenario: Select all
- **WHEN** the user ticks the header checkbox
- **THEN** every row is selected, and ticking it again clears them all

#### Scenario: Select all skips frozen stories
- **WHEN** six rows are shown, two of them frozen, and the user ticks the header checkbox
- **THEN** the four stories that are not frozen are selected, "4 selected" is shown, and the header checkbox shows as fully ticked

#### Scenario: Frozen checkbox disabled
- **WHEN** a frozen story is shown
- **THEN** its checkbox is disabled and cannot be ticked

#### Scenario: Range select
- **WHEN** the user ticks the second row and then shift-clicks the checkbox of the fifth row
- **THEN** rows two to five are all selected

#### Scenario: Range select over a frozen story
- **WHEN** the fourth row is frozen and the user ticks the second row and then shift-clicks the fifth
- **THEN** rows two, three and five are selected and row four is not

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
- **WHEN** 3 stories are selected, a search hides 2 of them, and the user applies an Epic to the selection
- **THEN** the confirmation names 3 stories and all 3 get the Epic

### Requirement: Delete selected unfrozen stories
When at least one story is selected in the Stories tab, the bulk bar SHALL offer **Delete selected (N)**, N being the number of selected stories. It SHALL ask for confirmation naming how many stories will be deleted before changing anything. Deleting SHALL apply to every selected story, hidden ones included. A frozen story cannot be selected (see "Multi-select in the Stories tab"), so it is never deleted this way. Deleted stories SHALL have their IDs removed from the `Depends On` of the stories that remain, and the remaining stories SHALL be renumbered once as described in "Story IDs carry initials, epic prefix and number". The deleted stories SHALL leave the selection, and the change SHALL save through the normal auto-save.

#### Scenario: Delete several
- **WHEN** four unfrozen stories are selected and the user clicks Delete selected (4) and confirms
- **THEN** the four are removed, the remaining stories are renumbered, and the selection is empty

#### Scenario: Cancel
- **WHEN** the user cancels the confirmation
- **THEN** no story is deleted and the selection is kept

#### Scenario: Frozen stories are skipped
- **WHEN** five stories are shown, two are frozen, and the user ticks select-all and deletes and confirms
- **THEN** the three unfrozen stories are deleted, the two frozen ones remain, and the confirmation named 3 stories

#### Scenario: Only frozen stories selected
- **WHEN** every story shown is frozen and the user ticks the header checkbox
- **THEN** no story is selected and Delete selected is not offered

### Requirement: Bulk edit selected unfrozen stories
When at least one story is selected in the Stories tab, the tool SHALL show a bulk edit bar with an Epic text field and a Feature text field. The Epic and Feature fields SHALL suggest the values already used in the backlog, and an empty field SHALL mean "no change"; the tool SHALL NOT clear an Epic or Feature in bulk. The Apply button SHALL be disabled until at least one of the two is set. Applying SHALL first ask for confirmation naming what will change and how many stories are affected; when the Epic change gives stories new IDs, the confirmation SHALL say so. A frozen story cannot be selected (see "Multi-select in the Stories tab"), so a bulk edit never reaches it. On confirmation the tool SHALL set only the chosen fields on every selected story, place the stories whose Epic changed at the bottom of the new Epic in their current row order, recompute IDs and rewrite dependencies as described in "Story IDs carry initials, epic prefix and number", leave all other fields and unselected stories untouched, keep the selection, reset the bar to "no change", and save through the normal auto-save. If the user cancels, nothing SHALL change. There SHALL be no undo.

#### Scenario: Set priority only
- **WHEN** 10 stories are selected and the bulk edit bar is shown
- **THEN** the bar offers only an Epic field and a Feature field, and no Priority control

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
- **WHEN** a file with a Priority column is opened, a bulk edit is applied and confirmed, and the file is saved
- **THEN** the saved file has no Priority column

#### Scenario: Several fields at once
- **WHEN** Epic "Billing" and Feature "Invoices" are both set and confirmed
- **THEN** both are applied to every selected story

#### Scenario: Nothing to apply
- **WHEN** stories are selected but the Epic and Feature fields are empty
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
- **WHEN** 5 stories are shown, 2 are frozen, and the user ticks select-all, sets Epic to "Billing" and confirms
- **THEN** the 3 unfrozen stories get Epic "Billing" and the frozen ones are unchanged

#### Scenario: Only frozen stories selected
- **WHEN** every story shown is frozen and the user ticks the header checkbox
- **THEN** no story is selected and the bulk edit bar is not shown

### Requirement: Frozen stories are read-only
A story is **frozen** when its `Frozen` cell holds `Yes`. Only `jois-story-plan` freezes stories (see the `frozen-stories` capability); the portal SHALL offer no way to freeze or unfreeze a story: no toggle on the story form, no button on an Epic or Feature header, no bulk action in the Stories tab and no keyboard shortcut. A frozen story SHALL be marked as frozen on its row in the story list, on its row in the Stories tab and on its form.

The form of a frozen story SHALL show every field read-only: Epic, Feature, Title, As a, I want, So that, Sprint points, its own Depends On, the acceptance criteria, Notes and Clarifications. The form SHALL say that the story is frozen because it is part of a slice, and that a change to it is made by a new story that supersedes it. The Depends On entries of other stories that name a frozen story SHALL stay editable, and a frozen story SHALL be offered in the Depends on picker of other stories like any other story. Ctrl+Up/Down SHALL select a frozen story like any other.

A frozen story SHALL NOT be draggable (see "Reorder unfrozen stories by drag and drop"), SHALL NOT be moved to Proposed (see the `story-proposals` capability), SHALL NOT be migrated to another backlog (see the `story-migration` capability) and SHALL NOT be deleted: Alt+D SHALL do nothing for it and the user SHALL be told that a frozen story cannot be deleted, and the Delete story button SHALL be disabled for it with the hint "A frozen story cannot be deleted". Its checkbox in the Stories tab SHALL be disabled, so Delete selected, Bulk edit and Migrate never reach it (see "Multi-select in the Stories tab"). Applying a review suggestion to a frozen story is covered by the `backlog-review-suggestions` capability.

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

#### Scenario: Not selectable in the Stories tab
- **WHEN** a frozen story is shown in the Stories tab
- **THEN** its checkbox is disabled
