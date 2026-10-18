## MODIFIED Requirements

### Requirement: Reorder stories by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an unlocked story and drop it between two stories of an Epic group, above the first or below the last. A locked story SHALL NOT be draggable. Other stories MAY be dropped between or around locked stories; a locked story keeps its ID wherever the stories around it land. Dropping within the story's own group SHALL reorder it. Dropping into another Epic's group SHALL set the story's Epic to that group's Epic and place it at the dropped position. Dropping onto the "(No epic)" group SHALL have no effect. A drop SHALL show where the story will land while dragging, SHALL keep the story selected, and SHALL be saved through the normal auto-save. Reordering within a group SHALL change the saved order of that group's rows only and SHALL NOT move the rows of other Epics or change the order of the groups. IDs and dependencies SHALL be updated as described in "Story IDs follow position". Open review suggestions of a story whose ID changes SHALL follow the story to its new ID.

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

#### Scenario: Suggestions follow a dragged story
- **WHEN** the story `IAM-0002` has an open review suggestion and dragging another story above it gives it the ID `IAM-0003`
- **THEN** the suggestion is shown on that story, now listed under `IAM-0003`, and no suggestion is reported as no longer matching a story

## ADDED Requirements

### Requirement: Reorder groups by drag and drop
In the story panel of the Editor tab, the user SHALL be able to drag an Epic head or a Feature head, expanded or collapsed, and drop it between two groups of the same level. An Epic SHALL be dropped between epics, above the first or below the last. A Feature SHALL be dropped only among the features of its own Epic, above the first or below the last. The whole group SHALL move as one block: all its stories keep their relative order and sit together at the new place. The "(No epic)" group SHALL NOT be draggable, and dropping a Feature onto another Epic SHALL have no effect. A locked story moves with its group and keeps its ID. While dragging, the panel SHALL show a drop line above or below the row where the group will land, in the style used for dragging a single story. The dragged group's stories SHALL stay as they are in the file apart from this move, and the selected story SHALL stay selected. The change SHALL be saved through the normal auto-save, and IDs and dependencies SHALL be updated as described in "Story IDs follow position". Open review suggestions of a story whose ID changes SHALL follow the story to its new ID.

#### Scenario: Suggestions follow a moved group
- **WHEN** the story `BI-0003` has an open review suggestion and moving its feature gives it the ID `BI-0001`
- **THEN** the suggestion is shown on that story as before, now listed under `BI-0001`, and it is saved with the review file

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

#### Scenario: Locked story moves with its group
- **WHEN** the feature Pay holds the locked story `BI-0002` and the feature is dropped below Refund
- **THEN** the locked story is still `BI-0002`, and the unlocked stories take the lowest free numbers in the new order

#### Scenario: Epic order changes a shared prefix
- **WHEN** "Data Delivery" and "Digital Dashboards" both start with `DD`, none of their stories is locked, and the user drops the second above the first
- **THEN** the stories of "Digital Dashboards" are numbered `DD-` and those of "Data Delivery" `DDA-`, and `Depends On` links follow their stories

#### Scenario: Dropped where it started
- **WHEN** a group is dropped at its own position
- **THEN** nothing changes and nothing is saved

### Requirement: Renumber stories in the displayed order
Beside the Add story button in the story panel of the Editor tab there SHALL be a Renumber button. Pressing it SHALL make the file order match what the panel shows within each Epic, by gathering the rows of each Feature into one block in the order the features are shown, and then renumber the stories as described in "Story IDs follow position". Rows of other Epics SHALL keep their positions. A locked story SHALL keep its ID, and its Epic SHALL keep the prefix of that ID. Before changing anything the button SHALL ask the user to confirm, saying how many stories get a new ID. The button SHALL be disabled, with a tooltip saying why, when pressing it would change no row and no ID. Open review suggestions of a story whose ID changes SHALL follow the story to its new ID. The change SHALL be saved through the normal auto-save and the selected story SHALL stay selected.

#### Scenario: Suggestions follow Renumber
- **WHEN** the story `BI-0003` has an open review suggestion and Renumber gives it the ID `BI-0002`
- **THEN** the suggestion is shown on that story, now listed under `BI-0002`, and no suggestion is reported as no longer matching a story

#### Scenario: Interleaved features are gathered
- **WHEN** the rows of "Billing" are Pay, Refund, Pay and the user presses Renumber and confirms
- **THEN** the rows become Pay, Pay, Refund and the stories are numbered `BI-0001` to `BI-0003` in the order the panel shows them

#### Scenario: Locked story kept
- **WHEN** `BI-0002` is locked and the user presses Renumber and confirms
- **THEN** it is still `BI-0002` and the unlocked stories of its Epic take the lowest free numbers around it

#### Scenario: Links follow
- **WHEN** a story depends on `BI-0003` and Renumber gives that story the ID `BI-0002`
- **THEN** the dependency now names `BI-0002`

#### Scenario: Declined
- **WHEN** the user presses Renumber and cancels the confirmation
- **THEN** nothing changes and nothing is saved

#### Scenario: Nothing to renumber
- **WHEN** every Feature's rows are already together and every ID already follows position
- **THEN** the Renumber button is disabled and its tooltip says the IDs already follow the order shown

#### Scenario: Other epics untouched
- **WHEN** Renumber gathers the features of "Billing"
- **THEN** the rows of other Epics keep their positions in the saved file
