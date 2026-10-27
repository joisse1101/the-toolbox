# backlog-guidelines Specification

## Purpose

Keeps the standards for a user-story backlog (Epic, Feature, User Story, acceptance criteria, size and INVEST) in one file, `planner/guidelines/product-backlog.md`, so that writing and reviewing stories apply the same rules.

## Requirements

### Requirement: One source of backlog standards
The repository SHALL hold the standards for a backlog in one file, `planner/guidelines/product-backlog.md`. It SHALL define what a valid Epic, Feature, User Story and acceptance criterion is, and it SHALL be written so that it can be used both to write stories and to review them. No other file SHALL restate those definitions or rules; other files (such as the review skill) SHALL cite the guidelines.

#### Scenario: Writing and reviewing use the same rules
- **WHEN** a story is written against the guidelines and then reviewed
- **THEN** the rules the reviewer applies are the ones in the guidelines, with no additional or conflicting rule in the review skill

#### Scenario: A rule changes
- **WHEN** a standard such as the size limit changes
- **THEN** it is changed in `planner/guidelines/product-backlog.md` only

### Requirement: Hierarchy definitions
The guidelines SHALL define the hierarchy Epic > Feature > User Story > Acceptance criteria as follows, with an example for each level taken from this project's backlog.

- An **Epic** SHALL be a domain area of the product, named by a short noun phrase (for example "Identity & Access Management"). It SHALL span several Features. It SHALL NOT be defined by duration or by a strategic outcome.
- A **Feature** SHALL be a capability a user would recognise by name, named by a short noun phrase. When all its stories are done it SHALL be demonstrable end to end. It SHALL be sliced into several stories; a Feature with one story SHALL be treated as a question (split, merge or intended). A Feature SHALL NOT be sized by duration.
- A **User Story** SHALL follow "As a <role>, I want <action>, so that <benefit>" and the INVEST principles, and belongs to exactly one Feature.
- **Acceptance criteria** SHALL be unambiguous, objective (pass or fail), say what the system does and not how it is built, and be written in Given-When-Then form, one `AC<n>` per criterion.

#### Scenario: Epic as a domain area
- **WHEN** a reader looks up what an Epic is
- **THEN** the guidelines describe a domain area spanning several Features and give no duration or strategic-outcome test

#### Scenario: Feature test
- **WHEN** a reader asks whether a candidate Feature is one
- **THEN** the guidelines give the test: a user would recognise it by name, it can be demonstrated end to end when its stories are done, and it has several stories

### Requirement: Story size and points
The guidelines SHALL state that a story is at most 13 sprint points and that a story above 13 SHALL be split. They SHALL list the point scale 1, 2, 3, 5, 8, 13 and SHALL NOT size a story by days or by sprint length. They SHALL point to `planner/guidelines/sprint-points-guideline.md` (by a link that resolves from the guidelines file) for the effort benchmarks instead of copying them. The sprint-points guideline SHALL give an example for every size on the scale and SHALL NOT hold unfilled template text.

#### Scenario: Thirteen is the limit
- **WHEN** a story is sized at 13
- **THEN** the guidelines treat it as acceptable, and a story sized at 21 or more is to be split

#### Scenario: No time-based size
- **WHEN** a reader looks for how big a story may be
- **THEN** the answer is stated in sprint points only

#### Scenario: Link resolves
- **WHEN** a reader follows the link to the sprint-points guideline
- **THEN** it opens `planner/guidelines/sprint-points-guideline.md`

### Requirement: INVEST meaning
The guidelines SHALL define each INVEST principle for this project. **Independent** SHALL mean decoupled for planning and development: the story can be prioritised, estimated and built in any order using mocks, stubs or test doubles for upstream state. A real-world order (such as Login before Logout) SHALL NOT count as a dependency problem. A **hard block** (the story cannot be built or tested without another story's code) SHALL be a problem and a **mockable** link SHALL NOT.

#### Scenario: Ordering is not coupling
- **WHEN** Logout needs a session that Login creates
- **THEN** the guidelines treat this as mockable and not as a violation of Independent

### Requirement: Measurable pass marks for subjective qualities
The guidelines SHALL say how to write an acceptance criterion for a quality that is subjective at first sight (such as "relevant", "readable" or "accurate"). The criterion SHALL carry a measurable bar: a fixed sample or set of cases, a threshold on a count or rate, and who or what judges the outcome. A criterion that leaves the judgment to whoever happens to review SHALL NOT count as objective. When the sample or threshold cannot be fixed yet, the story SHALL still state the criterion and name the missing value in Notes as "to be agreed", rather than drop the criterion or invent the value silently. The note SHALL live in `planner/guidelines/product-backlog.md` only; the skills SHALL cite it and SHALL NOT restate it.

#### Scenario: Subjective quality made measurable
- **WHEN** a story needs search results to be "relevant"
- **THEN** the guidelines' pattern leads to a criterion such as "given the agreed set of 10 example queries, when I search, then at least 8 return the expected story in the first 3 results"

#### Scenario: Value not yet known
- **WHEN** the team has not yet agreed the example queries
- **THEN** the criterion is written with the bar and Notes says the query set is to be agreed

#### Scenario: Reviewer judgement is not a bar
- **WHEN** a criterion says only "then the team accepts the results"
- **THEN** the guidelines treat it as not objective

### Requirement: Edge-case checklist
The guidelines SHALL hold one checklist of edge cases to test a story's acceptance criteria against, as a section of `planner/guidelines/product-backlog.md`, so that writing and reviewing stories use the same list. The checklist SHALL cover at least: empty and boundary input, invalid input, not found, not allowed, a repeated action, an action cancelled or undone part-way, partial failure, and data volume. Each item SHALL say when it does not apply (for example, "a read-only story has no repeated-action case"). The guidelines SHALL say how to classify a missing case: a case the story's Title and "I want" already imply SHALL be written as an acceptance criterion; a case that needs a decision, or that would add a capability, user group, permission or rule the story does not imply, SHALL be recorded as a Clarifications question and SHALL NOT be written as a criterion. The skills SHALL cite the checklist and SHALL NOT restate it.

#### Scenario: Implied case becomes a criterion
- **WHEN** a "Delete a saved filter" story has no criterion for a filter that no longer exists
- **THEN** the guidelines classify it as implied by the story, to be written as an acceptance criterion

#### Scenario: Decision case becomes a question
- **WHEN** a missing case would require choosing a retention period the story does not state
- **THEN** the guidelines classify it as a Clarifications question and not a criterion

#### Scenario: Not applicable
- **WHEN** a story only reads data and changes nothing
- **THEN** the repeated-action and partial-failure items are marked as not applying to it

#### Scenario: One list
- **WHEN** the checklist changes
- **THEN** it is changed in `planner/guidelines/product-backlog.md` only
