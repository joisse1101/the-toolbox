## MODIFIED Requirements

### Requirement: Review skill in the repository
The repository SHALL contain a review skill at `.claude/skills/review-backlog/SKILL.md` that reviews a backlog CSV from `user-stories/` against the standards in `guidelines/product-backlog.md`. The skill SHALL take a backlog file as input and SHALL produce a written report. The skill SHALL NOT restate the guidelines' definitions or rules: it SHALL cite them and describe only how to review (what to report, how to classify it, how to write the findings). The skill SHALL NOT modify the backlog CSV or any file other than its review CSV: it reports findings and suggests fixes, and the user applies them. The only file it may write is `reviews/<backlog file name>`, and only through the script described by the `backlog-review-suggestions` capability. The skill SHALL NOT review Priority.

#### Scenario: Report only
- **WHEN** the skill reviews `user-stories/data-portal.csv`
- **THEN** it outputs a report, the backlog CSV file is byte-for-byte unchanged, and the only file written is `reviews/data-portal.csv`

#### Scenario: Fixes are suggestions
- **WHEN** the skill finds a problem
- **THEN** the report states the story (by ID and Title), what is wrong, and a concrete suggested fix, without applying it, and the same fix is written to the review CSV as a field edit

#### Scenario: No file named
- **WHEN** the user invokes the skill without naming a backlog
- **THEN** the skill asks which backlog in `user-stories/` to review

#### Scenario: Priority is ignored
- **WHEN** a story has no Priority
- **THEN** the report and the review CSV do not mention Priority

#### Scenario: Rules come from the guidelines
- **WHEN** the size limit in `guidelines/product-backlog.md` changes
- **THEN** the skill's behaviour follows the guidelines without any edit to `SKILL.md`

### Requirement: Hierarchy review
The skill SHALL check that stories are sorted correctly under the Epic > Feature > Story hierarchy defined in the guidelines: that each Title describes a single user story and not a feature or epic, that each Feature is a capability sitting under a fitting Epic, that each Epic is a domain area spanning several Features, and that a Feature is sliced into more than one story. It SHALL report a Feature with a single story, an Epic with a single Feature, a Title that reads as a feature or epic, a Feature that reads as a single story, and a Feature that belongs under another Epic or appears under two Epics. A single-story Feature or single-Feature Epic SHALL be reported as a question for the user, not as an error. The naming style of an Epic SHALL NOT be reported.

#### Scenario: Title that is really a feature
- **WHEN** a story's Title is "Authentication" and other stories sit under a Feature of the same name
- **THEN** the report says the Title looks like a feature and suggests a story-sized title

#### Scenario: Single-story feature
- **WHEN** a Feature has exactly one story
- **THEN** the report lists it as a question: split the story, merge the Feature into another, or confirm it is intended

#### Scenario: Misplaced feature
- **WHEN** a Feature sits under an Epic whose other Features are unrelated to it
- **THEN** the report names the Feature and the Epic it more likely belongs under

### Requirement: Acceptance criteria review
The skill SHALL review each story's acceptance criteria against the acceptance-criteria rules in `guidelines/product-backlog.md`: each criterion SHALL be unambiguous, objective and testable as pass or fail, SHALL say what the system must do and not how to build it, and the criteria together SHALL cover the intent of the story's Title and "I want". It SHALL report vague wording (for example "fast" or "user friendly" with no measure), implementation detail, a criterion that cannot fail, and a story whose criteria leave an obvious case uncovered, such as a failure path. A suggested measurable wording for a vague criterion SHALL be marked as needing the user's confirmation of the threshold.

#### Scenario: Vague criterion
- **WHEN** a criterion's Then says "the page loads quickly"
- **THEN** the report flags it as not objective and suggests a measurable threshold for the user to confirm

#### Scenario: Implementation detail
- **WHEN** a criterion's Then names a database table or class
- **THEN** the report flags it as describing how and suggests restating it as observable behaviour

#### Scenario: Missing failure path
- **WHEN** a login story has only a success criterion
- **THEN** the report suggests an additional criterion for invalid credentials
