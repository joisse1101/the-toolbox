# Spec Delta

## MODIFIED Requirements

### Requirement: Tasks link the artboards of their criteria
When the backlog's `design-index.csv` holds rows for the stories of the slice, the writer SHALL read that file itself and take the rows as the story index, keyed by story ID and criterion text. Every task that satisfies a criterion with artboards in the index SHALL carry a `Design` line naming at least one of that criterion's artboard links. The writer SHALL refuse the slice and name each task that lacks one. When `designs.json` links a canvas to the slice's scope and the file holds no row for a story in the slice, the writer SHALL refuse the slice and name the story.

#### Scenario: Screen task without a design line
- **WHEN** a task satisfies a criterion that the index points to two artboards, and the task has no `Design` line
- **THEN** the check fails, names the task and the criterion, and nothing is written

#### Scenario: Backend task
- **WHEN** a task satisfies only criteria that the index points to no artboard
- **THEN** the task needs no `Design` line and passes

#### Scenario: Backlog without a design
- **WHEN** `design-index.csv` holds no row for the slice's stories and `designs.json` links no canvas to the slice's scope
- **THEN** no task needs a `Design` line, and the check behaves as before

#### Scenario: Designed scope with a story that has no rows
- **WHEN** `designs.json` links a canvas to the scope and one story of the slice has no row in `design-index.csv`
- **THEN** the writer refuses the slice, names the story, and writes nothing

### Requirement: Design links name the scope's canvas
Every link in a `Design` line SHALL be built from the `Canvas` link and one artboard stem of a row of the story index for a criterion the task satisfies. The writer SHALL refuse any other link.

#### Scenario: Link to another canvas
- **WHEN** a `Design` line names an artboard of a canvas that is not the `Canvas` of the criterion's row
- **THEN** the check fails and names the task and the link

#### Scenario: Link to an artboard of another criterion
- **WHEN** a `Design` line names an artboard that the index gives only for a criterion the task does not satisfy
- **THEN** the check fails and names the task and the link

#### Scenario: Story migrated from another backlog
- **WHEN** a migrated story's row carries a canvas link that this backlog's `designs.json` does not list
- **THEN** a `Design` line built from that row's canvas and stem passes
