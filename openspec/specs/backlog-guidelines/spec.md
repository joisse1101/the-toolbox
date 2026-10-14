# backlog-guidelines Specification

## Purpose

Keeps the standards for a user-story backlog (Epic, Feature, User Story, acceptance criteria, size and INVEST) in one file, `guidelines/product-backlog.md`, so that writing and reviewing stories apply the same rules.

## Requirements

### Requirement: One source of backlog standards
The repository SHALL hold the standards for a backlog in one file, `guidelines/product-backlog.md`. It SHALL define what a valid Epic, Feature, User Story and acceptance criterion is, and it SHALL be written so that it can be used both to write stories and to review them. No other file SHALL restate those definitions or rules; other files (such as the review skill) SHALL cite the guidelines.

#### Scenario: Writing and reviewing use the same rules
- **WHEN** a story is written against the guidelines and then reviewed
- **THEN** the rules the reviewer applies are the ones in the guidelines, with no additional or conflicting rule in the review skill

#### Scenario: A rule changes
- **WHEN** a standard such as the size limit changes
- **THEN** it is changed in `guidelines/product-backlog.md` only

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
The guidelines SHALL state that a story is at most 13 sprint points and that a story above 13 SHALL be split. They SHALL list the point scale 1, 2, 3, 5, 8, 13 and SHALL NOT size a story by days or by sprint length. They SHALL point to `src/user-story-generator/sprint-points-guideline.md` for the effort benchmarks instead of copying them.

#### Scenario: Thirteen is the limit
- **WHEN** a story is sized at 13
- **THEN** the guidelines treat it as acceptable, and a story sized at 21 or more is to be split

#### Scenario: No time-based size
- **WHEN** a reader looks for how big a story may be
- **THEN** the answer is stated in sprint points only

### Requirement: INVEST meaning
The guidelines SHALL define each INVEST principle for this project. **Independent** SHALL mean decoupled for planning and development: the story can be prioritised, estimated and built in any order using mocks, stubs or test doubles for upstream state. A real-world order (such as Login before Logout) SHALL NOT count as a dependency problem. A **hard block** (the story cannot be built or tested without another story's code) SHALL be a problem and a **mockable** link SHALL NOT.

#### Scenario: Ordering is not coupling
- **WHEN** Logout needs a session that Login creates
- **THEN** the guidelines treat this as mockable and not as a violation of Independent
