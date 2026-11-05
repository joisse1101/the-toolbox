## ADDED Requirements

### Requirement: Failure responses with no failure criterion
The skill's review reply SHALL list each row of the document's `## Failure responses` table whose `AC id` row is on the main path and that no task's `Verify:` line names. It SHALL name each by its failure and its step, and say that no failure criterion covers it, so the user can decide whether to add one.

#### Scenario: Failure drawn without a criterion
- **WHEN** a failure response such as "wrong password" is tied to a main-path criterion and no task names it
- **THEN** the review reply lists it as a failure path no task covers

#### Scenario: Failure with its own task
- **WHEN** a task's Verify line names the failure and its client response
- **THEN** the review reply does not list it

### Requirement: When a rule counts as covered
A security or non-functional rule, or a failure response, SHALL count as covered when some task's `Verify:` line names it. The skill SHALL list every rule and failure response that no `Verify:` line names, and SHALL NOT count a rule as covered because a task cites a step the rule's `Steps` cell lists.

#### Scenario: Rule checked in passing
- **WHEN** a task's Verify line states the cookie flags that a rule requires
- **THEN** that rule counts as covered

#### Scenario: Step cited, rule not named
- **WHEN** a task cites a step that a rule's Steps cell lists but its Verify line never names the rule
- **THEN** the rule is listed as not covered

### Requirement: Task depending on a TBC decision
A task SHALL count as depending on a design decision whose source is `TBC` when the decision's `Steps` cell lists a step the task cites, and the skill SHALL name that decision's id in the task's `Verify:` line. An open question that names a decision id SHALL inherit the dependency. Any other open question SHALL be listed in the review reply and SHALL NOT be required in a `Verify:` line.

#### Scenario: Cited step belongs to a TBC decision
- **WHEN** a task cites step 2.5 and decision D7, still `TBC`, lists step 2.5
- **THEN** the task's Verify line names D7

#### Scenario: Open question with no decision
- **WHEN** an open question names no decision id
- **THEN** the review reply lists it and no Verify line has to mention it
