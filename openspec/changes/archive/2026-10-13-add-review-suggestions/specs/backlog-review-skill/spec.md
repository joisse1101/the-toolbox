## MODIFIED Requirements

### Requirement: Review skill in the repository
The repository SHALL contain a review skill at `.claude/skills/review-backlog/SKILL.md` that reviews a backlog CSV from `user-stories/` against the guidance in `product-management.md`. The skill SHALL take a backlog file as input and SHALL produce a written report. The skill SHALL NOT modify the backlog CSV or any file other than its review CSV: it reports findings and suggests fixes, and the user applies them. The only file it may write is `reviews/<backlog file name>`, and only through the script described by the `backlog-review-suggestions` capability. The skill SHALL NOT review Priority.

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
