## MODIFIED Requirements

### Requirement: Review skill in the repository
The toolkit SHALL contain a review skill, `toolkit/skills/jois-story-review/SKILL.md`, that reviews a backlog CSV from the data folder against the standards in `product-backlog.md`, which the skill carries in its own `references/` folder. The skill SHALL take a backlog as input and SHALL produce a written report. The skill SHALL NOT restate the guidelines' definitions or rules: it SHALL cite them and describe only how to review (what to report, how to classify it, how to write the findings). The skill SHALL NOT modify the backlog CSV or any file other than its review CSV: it reports findings and suggests fixes, and the user applies them. The only file it may write is `<backlog>/user-stories/review.csv`, and only through the writer script described by the `backlog-review-suggestions` capability, run with Bash.

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
- **WHEN** the backlog file still has an old Priority column
- **THEN** the report and the review CSV do not mention Priority

#### Scenario: Rules come from the guidelines
- **WHEN** the size limit in the skill's `references/product-backlog.md` changes
- **THEN** the skill's behaviour follows the guidelines without any edit to `SKILL.md`
