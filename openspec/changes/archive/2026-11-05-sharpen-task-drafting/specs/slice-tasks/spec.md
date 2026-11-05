## ADDED Requirements

### Requirement: Accepted layout forms
The writer SHALL accept a `tasks.md` that opens with a `# Tasks` title line, that has blank lines between tasks, and that lists the steps of a task as bare step ids separated by commas or spaces. It SHALL ignore text outside the `## <flow>` groups and the task lines. It SHALL refuse a step id written with its flow as a prefix, because the flow is the task's group.

#### Scenario: Title line
- **WHEN** the file opens with `# Tasks` before the first `## <flow>` group
- **THEN** the title line is ignored and the check passes

#### Scenario: Blank lines
- **WHEN** a blank line separates two tasks
- **THEN** both tasks are read and the check passes

#### Scenario: Flow-prefixed step
- **WHEN** a task cites a step as `pin 2.3` instead of `2.3`
- **THEN** the check fails and names the task and the step it could not find

### Requirement: Steps of a task naming several criteria
When a task names several `AC id` rows, the steps in its `Satisfies:` line SHALL be one list that applies to the task as a whole, and the writer SHALL check only that each step exists in the diagram of the task's flow. A step outside the Steps column of a named row SHALL NOT be refused by the writer.

#### Scenario: Pooled steps
- **WHEN** a task names two criteria and lists steps drawn from both rows
- **THEN** the check passes

#### Scenario: Step outside the row
- **WHEN** a task cites an existing step that the named row's Steps column does not list
- **THEN** the writer does not refuse it
