## MODIFIED Requirements

### Requirement: Only the plan skill freezes stories
Only `jois-story-plan` SHALL freeze stories, and the portal SHALL NOT offer any control that freezes or unfreezes a story, an Epic, a Feature or a selection. Freezing SHALL happen only after the user has confirmed a slice, with the same yes/no that the skill asks before it writes the slice, and after the slice has been verified with no critical finding open, and SHALL cover every story that slice covers. The skill SHALL freeze through its own validated writer. The writer SHALL refuse a story that has no ID, and a story whose ID does not begin with the backlog's initials (an ID the portal has not yet rewritten), and SHALL leave a story that is already frozen as it is, so freezing the same story twice leaves the same result as freezing it once. It SHALL change only the `Frozen` flag of the stories it names: no other field, row, column or ID SHALL change. It SHALL write atomically, and the skill SHALL read the backlog back in the same turn and call the stories frozen only when the read-back matches. A frozen story SHALL NOT be unfrozen by any way the system offers. A freeze made by mistake SHALL be undone only by editing the CSV by hand, and the project's wiki SHALL say so.

#### Scenario: Freeze after the confirm
- **WHEN** the user confirms a slice that covers three stories with IDs and verify leaves no critical finding open
- **THEN** after the slice is written and verified the three stories have `Yes` in `Frozen`, and no other cell of the backlog changed

#### Scenario: Nothing frozen before the yes
- **WHEN** the user has not answered the yes/no
- **THEN** no story is frozen

#### Scenario: Nothing frozen while a critical finding is open
- **WHEN** the user confirmed the slice and verify still reports a critical finding
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
