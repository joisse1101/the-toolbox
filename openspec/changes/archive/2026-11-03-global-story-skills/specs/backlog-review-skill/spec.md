# Spec Delta

## MODIFIED Requirements

### Requirement: Review skill in the repository
The toolkit SHALL contain a review skill, `toolkit/skills/jois-story-review/SKILL.md`, that reviews a backlog CSV from the data folder against the standards in `product-backlog.md`, which the skill carries in its own `references/` folder. The skill SHALL take a backlog as input and SHALL produce a written report. The skill SHALL NOT restate the guidelines' definitions or rules: it SHALL cite them and describe only how to review (what to report, how to classify it, how to write the findings). The skill SHALL NOT modify the backlog CSV or any file other than its review CSV: it reports findings and suggests fixes, and the user applies them. The only file it may write is `<backlog>/user-stories/review.csv`, and only through the writer script described by the `backlog-review-suggestions` capability, run with Bash. The skill SHALL NOT review Priority.

#### Scenario: Report only
- **WHEN** the skill reviews the backlog `data-portal`
- **THEN** it outputs a report, the backlog CSV file is byte-for-byte unchanged, and the only file written is `data-portal/user-stories/review.csv`

#### Scenario: Fixes are suggestions
- **WHEN** the skill finds a problem
- **THEN** the report states the story (by ID and Title), what is wrong, and a concrete suggested fix, without applying it, and the same fix is written to the review CSV as a field edit

#### Scenario: No file named
- **WHEN** the user invokes the skill without naming a backlog
- **THEN** the skill asks which backlog in the data folder to review

#### Scenario: Priority is ignored
- **WHEN** a story has no Priority
- **THEN** the report and the review CSV do not mention Priority

#### Scenario: Rules come from the guidelines
- **WHEN** the size limit in the skill's `references/product-backlog.md` changes
- **THEN** the skill's behaviour follows the guidelines without any edit to `SKILL.md`

### Requirement: Acceptance criteria review
The skill SHALL review each story's acceptance criteria against the acceptance-criteria rules in `references/product-backlog.md`: each criterion SHALL be unambiguous, objective and testable as pass or fail, SHALL say what the system must do and not how to build it, and the criteria together SHALL cover the intent of the story's Title and "I want". It SHALL report vague wording (for example "fast" or "user friendly" with no measure), implementation detail, a criterion that cannot fail, and a story whose criteria leave an obvious case uncovered, such as a failure path. A suggested measurable wording for a vague criterion SHALL be marked as needing the user's confirmation of the threshold.

#### Scenario: Vague criterion
- **WHEN** a criterion's Then says "the page loads quickly"
- **THEN** the report flags it as not objective and suggests a measurable threshold for the user to confirm

#### Scenario: Implementation detail
- **WHEN** a criterion's Then names a database table or class
- **THEN** the report flags it as describing how and suggests restating it as observable behaviour

#### Scenario: Missing failure path
- **WHEN** a login story has only a success criterion
- **THEN** the report suggests an additional criterion for invalid credentials

### Requirement: Consistency review across the backlog
Besides the per-story review, the skill SHALL review the backlog as a whole and report, under the Area "Consistency", the problems that only show when stories are compared. It SHALL start from the mechanical report (`checks` section) and turn each problem on a submitted story into a finding with a field-edit row where one fits, and a Clarifications `append` row where the fix needs a decision. Rows from the cross-story, lexicon and proposal checks SHALL have Area `Consistency`; a dependency problem (dangling, cyclic or hard-block) keeps Area `INVEST`. It SHALL also look, Epic by Epic, for: stories that overlap or duplicate each other or a proposed story, acceptance criteria of one story that contradict another's, the same role named differently across stories, a term used in a way its lexicon definition does not allow or under a name the lexicon says to avoid, and a Feature or Epic whose stories together do not deliver what its name promises. The skill SHALL read the backlog, lexicon, proposals and sizing guideline with ordinary file tools or its context reader script, SHALL read them in parts when they are too large for one output, SHALL review one Epic at a time, and SHALL read every Epic before it reports, so that a large backlog is covered in full. The skill SHALL NOT write to the lexicon or the proposals; a lexicon change it wants SHALL be raised as a question in the report or as a Clarifications row on the affected story. It SHALL NOT propose a change that adds a capability, user group, permission or rule beyond what the story implies.

#### Scenario: Role drift
- **WHEN** one story is written for "a team lead" and a story in the same Feature for "a lead"
- **THEN** the report lists both under Consistency and suggests one name, as a `replace` row on User Story for each submitted story

#### Scenario: Overlap with a proposal
- **WHEN** a submitted story does the same thing as a proposed story
- **THEN** the report names both under Consistency and the row is a Clarifications `append` asking whether to keep one, since the skill cannot edit proposals

#### Scenario: Avoided word
- **WHEN** the mechanical report shows a story uses a word its lexicon says to avoid
- **THEN** the skill writes a `replace` row that swaps the word for the defined term

#### Scenario: Large backlog
- **WHEN** the backlog is too large to read in one output
- **THEN** the skill reads the menu, each Epic in turn and the other sections, and its summary says how many Epics it covered

#### Scenario: Skill does not write the lexicon
- **WHEN** a story needs a term that is not defined
- **THEN** the review writes no lexicon row and the report asks the user whether to define the term

### Requirement: Edge-case review
For each submitted story the skill SHALL check its acceptance criteria against the edge-case checklist in `references/product-backlog.md` and SHALL NOT restate the checklist. A case the story's Title and "I want" already imply and the criteria leave out SHALL be written as an `add` row on User Acceptance Criteria. A case that would need a decision or new scope SHALL be written as a Clarifications `append` row, not as a criterion. The Area of the first SHALL be "Acceptance criteria" and of the second "Clarification". It SHALL NOT raise a case the checklist marks as not applicable to the story.

#### Scenario: Implied case
- **WHEN** a "Delete a saved filter" story has no criterion for a filter that no longer exists
- **THEN** the review has an `add` row with a Given-When-Then criterion for it

#### Scenario: Case that needs a decision
- **WHEN** the story implies no rule for how long a deleted filter can be restored
- **THEN** the review has a Clarifications `append` row asking it and no criterion that invents the answer
