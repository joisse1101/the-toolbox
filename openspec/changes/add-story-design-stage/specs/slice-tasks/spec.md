# Spec Delta

## MODIFIED Requirements

### Requirement: Task format
`tasks.md` SHALL hold one `## <flow>` group per flow of the slice's sequence diagrams, in the order of the document, and under each group a list of tasks. Each task SHALL be a checkbox line `- [ ] <task id> <title>` or `- [x] <task id> <title>`, followed by two indented lines, `Satisfies: <AC id>[, <AC id>] (steps <step ids>)` and `Verify: <how to verify the task>`. A task MAY carry a third indented line, `Design: <artboard link>[, <artboard link>]`, between `Satisfies` and `Verify`. A task id SHALL be `T-<slice>-<name>` in kebab-case and unique in the file. A step id SHALL exist in its flow's sequence diagram. The checkbox SHALL be the only record of whether a task is done.

#### Scenario: Valid task
- **WHEN** a task line is followed by a `Satisfies` line naming an `AC id` of the acceptance-criteria table and by a non-empty `Verify` line
- **THEN** the task passes the format check

#### Scenario: Valid task with a design line
- **WHEN** a task line is followed by a `Satisfies` line, a `Design` line naming one or more artboard links, and a non-empty `Verify` line
- **THEN** the task passes the format check

#### Scenario: Group is not a flow
- **WHEN** a `## ` group names a flow that has no sequence diagram in the document
- **THEN** the check fails and names the group

#### Scenario: Missing verification
- **WHEN** a task has no `Verify` line or an empty one
- **THEN** the check fails and names the task

## ADDED Requirements

### Requirement: Tasks link the artboards of their criteria
When the backlog's `designs.json` links a canvas to the slice's scope, the writer SHALL take the story index as input, keyed by story Title and criterion text. Every task that satisfies a criterion with artboards in the index SHALL carry a `Design` line naming at least one of that criterion's artboard links. The writer SHALL refuse the slice and name each task that lacks one.

#### Scenario: Screen task without a design line
- **WHEN** a task satisfies a criterion that the index points to two artboards, and the task has no `Design` line
- **THEN** the check fails, names the task and the criterion, and nothing is written

#### Scenario: Backend task
- **WHEN** a task satisfies only criteria that the index points to no artboard
- **THEN** the task needs no `Design` line and passes

#### Scenario: Backlog without a design
- **WHEN** `designs.json` links no canvas to the slice's scope
- **THEN** no task needs a `Design` line, and the check behaves as before

### Requirement: Design links name the scope's canvas
Every link in a `Design` line SHALL point to an artboard of the canvas that `designs.json` links to the slice's scope, and SHALL be one of the links the story index gives for a criterion the task satisfies. The writer SHALL refuse any other link.

#### Scenario: Link to another canvas
- **WHEN** a `Design` line names an artboard of a canvas that is not the scope's
- **THEN** the check fails and names the task and the link

#### Scenario: Link to an artboard of another criterion
- **WHEN** a `Design` line names an artboard that the index gives only for a criterion the task does not satisfy
- **THEN** the check fails and names the task and the link
