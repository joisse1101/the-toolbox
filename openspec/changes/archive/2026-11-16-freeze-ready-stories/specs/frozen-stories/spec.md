## ADDED Requirements

### Requirement: Only a ready story is frozen
A story SHALL be **ready** when it has no open clarification (a `Q<n>:` whose `A<n>:` is empty, as `story-clarifications` defines). The freeze writer SHALL refuse a story that is not ready, leave it not frozen, and name its open questions in its reply, as it does for a story with no ID. It SHALL still freeze the other stories of the same request. A story with no pairs, or with every answer filled in, is ready.

#### Scenario: Open question refuses the freeze
- **WHEN** the writer is asked to freeze two stories and one has a clarification with an empty answer
- **THEN** the other story is frozen, the first stays not frozen, and the reply names the first story and its open question

#### Scenario: Cleared story freezes
- **WHEN** the writer is asked to freeze a story whose every clarification is answered
- **THEN** the story is frozen

#### Scenario: Check run reports the same refusal
- **WHEN** the writer is run with `--check` on a story with an open clarification
- **THEN** it reports the refusal and writes nothing

### Requirement: A frozen story is built in full by its slice
A story SHALL be frozen only by a slice that covers every acceptance criterion of that story, so that "frozen" means the story is fixed and the slice builds all of it. A part of a story that a slice does not build SHALL be split into a new story that is not frozen, before the freeze, as `plan-stories-skill` describes. A story found too big after it is frozen SHALL be changed only by a superseding story, as "Frozen stories are reference only" says.

#### Scenario: Slice builds the whole story
- **WHEN** a slice has a task for every acceptance criterion of a ready story and the user confirms it
- **THEN** the story is frozen

#### Scenario: Part of a story left for later
- **WHEN** a slice would build two of a story's three acceptance criteria
- **THEN** the story is not frozen by that slice until the third criterion is split into a story of its own

## MODIFIED Requirements

### Requirement: Only the plan skill freezes stories
Only `jois-story-plan` SHALL freeze stories, and the portal SHALL NOT offer any control that freezes or unfreezes a story, an Epic, a Feature or a selection. Freezing SHALL happen only after the user has confirmed a slice, with the same yes/no that the skill asks before it writes the slice, and after the slice has been verified with no critical finding open, and SHALL cover every ready story that slice covers. The skill SHALL freeze through its own validated writer. The writer SHALL refuse a story that has no ID, a story whose ID does not begin with the backlog's initials (an ID the portal has not yet rewritten) and a story that is not ready, and SHALL leave a story that is already frozen as it is, so freezing the same story twice leaves the same result as freezing it once. It SHALL change only the `Frozen` flag of the stories it names: no other field, row, column or ID SHALL change. It SHALL write atomically, and the skill SHALL read the backlog back in the same turn and call the stories frozen only when the read-back matches. A frozen story SHALL NOT be unfrozen by any way the system offers. A freeze made by mistake SHALL be undone only by editing the CSV by hand, and the project's wiki SHALL say so.

#### Scenario: Freeze after the confirm
- **WHEN** the user confirms a slice that covers three ready stories with IDs and verify leaves no critical finding open
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

#### Scenario: Story with an open clarification
- **WHEN** a request names a story that has an open clarification
- **THEN** the writer refuses that story, it stays not frozen, and the skill tells the user to resolve the question first

#### Scenario: Already frozen
- **WHEN** a slice covers a story that is already frozen
- **THEN** the story is left as it is and the file is otherwise unchanged

#### Scenario: Freezing twice
- **WHEN** the same freeze is run again after it succeeded
- **THEN** the backlog is unchanged

#### Scenario: Portal cannot freeze or unfreeze
- **WHEN** a story is open in the Editor tab or selected in the Stories tab
- **THEN** there is no control that freezes it or unfreezes it
