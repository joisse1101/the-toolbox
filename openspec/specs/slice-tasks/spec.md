# slice-tasks Specification

## Purpose
Defines the build-task checklist (`tasks.md`) of a slice: how the plan skill drafts and confirms it with the slice, its format, the checks that every criterion has a task, how ticks carry over a redraw, and how its progress and staleness are reported.

## Requirements

### Requirement: Tasks are written with the slice
The plan skill SHALL draft the build tasks of a slice together with the slice, show the complete text of `tasks.md` in the same reply as the slice document, and write both files in one write after one yes/no, so that the slice and its tasks are never out of step. The slice writer SHALL write `tasks.md` into the slice's folder, `<backlog>/slices/<slice>/`, next to `UC-<slice>.md`, and SHALL write nothing of either file when a check on either fails. After the write, the skill SHALL read the slice back and call it written only when both files read back as sent, with ticks as the writer carried them over.

#### Scenario: One review, one write
- **WHEN** the user confirms "Write this slice?" after seeing the document and the tasks
- **THEN** the writer writes `UC-<slice>.md`, `tasks.md` and `source.json` together

#### Scenario: A failing task check blocks the document
- **WHEN** a task fails a check and the document is valid
- **THEN** nothing is written and the reply names the task

#### Scenario: Slice without tasks
- **WHEN** a slice written before this capability has no `tasks.md`
- **THEN** it is read as before, and the next redraw writes a `tasks.md` with it

### Requirement: Task format
`tasks.md` SHALL hold one `## <flow>` group per flow of the slice's sequence diagrams, in the order of the document, and under each group a list of tasks. Each task SHALL be a checkbox line `- [ ] <task id> <title>` or `- [x] <task id> <title>`, followed by two indented lines, `Satisfies: <AC id>[, <AC id>] (steps <step ids>)` and `Verify: <how to verify the task>`. A task id SHALL be `T-<slice>-<name>` in kebab-case and unique in the file. A step id SHALL exist in its flow's sequence diagram. The checkbox SHALL be the only record of whether a task is done.

#### Scenario: Valid task
- **WHEN** a task line is followed by a `Satisfies` line naming an `AC id` of the acceptance-criteria table and by a non-empty `Verify` line
- **THEN** the task passes the format check

#### Scenario: Group is not a flow
- **WHEN** a `## ` group names a flow that has no sequence diagram in the document
- **THEN** the check fails and names the group

#### Scenario: Missing verification
- **WHEN** a task has no `Verify` line or an empty one
- **THEN** the check fails and names the task

### Requirement: Tasks cover every criterion
The writer SHALL refuse a `tasks.md` in which a task names an `AC id` that is not a row of the document's acceptance-criteria table, in which two tasks share an id, or in which a row of the table has no task. Stories SHALL be named by Title wherever a task text or a reply refers to one.

#### Scenario: Uncovered criterion
- **WHEN** a row of the acceptance-criteria table has no task naming its `AC id`
- **THEN** the writer refuses and names the `AC id` and its story by Title

#### Scenario: Unknown criterion
- **WHEN** a task names an `AC id` that is not in the table
- **THEN** the writer refuses and names the task and the `AC id`

### Requirement: Done state survives a redraw
When the slice is written again, the writer SHALL read the `tasks.md` already in the folder and set a task to done in the new file when the old file marked the task with the same task id as done and the text of every criterion the task names is, byte for byte, the text in the old document's table. The skill SHALL send every task unticked, and the writer SHALL decide each tick, so that a tick made by hand since the skill last read is never lost. A task whose criterion text changed SHALL be written unticked and a task id the new file no longer holds SHALL be dropped, and the writer's reply SHALL list each of them by task id and title, so that a reset or a drop is never silent. Sending the same slice again SHALL leave both files byte for byte unchanged.

#### Scenario: Tick kept
- **WHEN** a ticked task's criterion text is unchanged in the redrawn document
- **THEN** the task is written ticked

#### Scenario: Criterion reworded
- **WHEN** a ticked task names a criterion whose text changed
- **THEN** the task is written unticked and the reply lists it as reset

#### Scenario: Task removed
- **WHEN** the redrawn `tasks.md` no longer holds a ticked task's id
- **THEN** the reply lists the task as dropped

#### Scenario: Tick made by hand after the skill read
- **WHEN** the user ticks a task in the file after the skill read it and the slice is then written again
- **THEN** the tick is still there afterwards

#### Scenario: Repeated write
- **WHEN** the same slice and tasks are written twice
- **THEN** the second write changes no byte and says nothing changed

### Requirement: Staleness of tasks follows the slice
The tasks of a slice SHALL be reported stale exactly when the slice is stale, and the read script SHALL NOT keep a second record of staleness for them. The read script SHALL report, for a slice that has `tasks.md`, how many tasks are done out of the total, and SHALL change no tick.

#### Scenario: Story reworded
- **WHEN** a story of the slice changed since the slice was written
- **THEN** the read reports the slice as stale, and that report covers its tasks

#### Scenario: Progress
- **WHEN** a slice has 6 tasks of which 2 are ticked
- **THEN** the read reports 2 of 6 done

#### Scenario: Read changes no tick
- **WHEN** the read script is run on a slice with ticked tasks
- **THEN** no byte of `tasks.md` changes
