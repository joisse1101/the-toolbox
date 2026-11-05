## ADDED Requirements

### Requirement: Task granularity
The skill SHALL draft one task per acceptance criterion by default and SHALL split a criterion into several tasks only along participants or phases of its flow when each piece can be verified alone. It SHALL NOT fold a failure criterion into the task of a main-path criterion, and it SHALL copy the step ids of a task from the Steps column of the criterion's row.

#### Scenario: Failure criterion
- **WHEN** a flow has a main-path criterion and a failure criterion
- **THEN** each is named by its own task

#### Scenario: Step the row lacks
- **WHEN** a task needs a step that its criterion's row does not list
- **THEN** the skill tells the user the table is missing it and does not cite it silently

### Requirement: Verify lines
The skill SHALL write each task's `Verify:` line so that it names an input and an observable result for every step the task cites, and says how to reach a state the check needs. It SHALL NOT write a line that only restates the task title.

#### Scenario: Cited step with no check
- **WHEN** a task cites a screen step
- **THEN** its Verify line says what the screen shows

#### Scenario: State to reach
- **WHEN** a check needs an overdue loan or a shipped order
- **THEN** the Verify line says how to make one

### Requirement: Open items in tasks
When a task depends on a design decision marked `TBC` or on an open question, the skill SHALL say so in that task's `Verify:` line by naming the decision id or the question. In its review reply it SHALL list the security and non-functional rules, `TBC` rows and open questions that no task covers, so the user sees what was left out.

#### Scenario: Task on a TBC row
- **WHEN** a task's behavior depends on a design decision whose source is `TBC`
- **THEN** its Verify line names that decision

#### Scenario: Rule with no task
- **WHEN** the document holds a security rule that no criterion names
- **THEN** the review reply lists it as not covered by a task
