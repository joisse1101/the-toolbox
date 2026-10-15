## MODIFIED Requirements

### Requirement: Story size and points
The guidelines SHALL state that a story is at most 13 sprint points and that a story above 13 SHALL be split. They SHALL list the point scale 1, 2, 3, 5, 8, 13 and SHALL NOT size a story by days or by sprint length. They SHALL point to `ai/guidelines/sprint-points-guideline.md` (by a link that resolves from the guidelines file) for the effort benchmarks instead of copying them. The sprint-points guideline SHALL give an example for every size on the scale and SHALL NOT hold unfilled template text.

#### Scenario: Thirteen is the limit
- **WHEN** a story is sized at 13
- **THEN** the guidelines treat it as acceptable, and a story sized at 21 or more is to be split

#### Scenario: No time-based size
- **WHEN** a reader looks for how big a story may be
- **THEN** the answer is stated in sprint points only

#### Scenario: Link resolves
- **WHEN** a reader follows the link to the sprint-points guideline
- **THEN** it opens `ai/guidelines/sprint-points-guideline.md`

## ADDED Requirements

### Requirement: Measurable pass marks for subjective qualities
The guidelines SHALL say how to write an acceptance criterion for a quality that is subjective at first sight (such as "relevant", "readable" or "accurate"). The criterion SHALL carry a measurable bar: a fixed sample or set of cases, a threshold on a count or rate, and who or what judges the outcome. A criterion that leaves the judgment to whoever happens to review SHALL NOT count as objective. When the sample or threshold cannot be fixed yet, the story SHALL still state the criterion and name the missing value in Notes as "to be agreed", rather than drop the criterion or invent the value silently. The note SHALL live in `ai/guidelines/product-backlog.md` only; the skills SHALL cite it and SHALL NOT restate it.

#### Scenario: Subjective quality made measurable
- **WHEN** a story needs search results to be "relevant"
- **THEN** the guidelines' pattern leads to a criterion such as "given the agreed set of 10 example queries, when I search, then at least 8 return the expected story in the first 3 results"

#### Scenario: Value not yet known
- **WHEN** the team has not yet agreed the example queries
- **THEN** the criterion is written with the bar and Notes says the query set is to be agreed

#### Scenario: Reviewer judgement is not a bar
- **WHEN** a criterion says only "then the team accepts the results"
- **THEN** the guidelines treat it as not objective
