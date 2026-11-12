## MODIFIED Requirements

### Requirement: Mock and fixture
A mock slice kept with the plan skill's tests SHALL be hand-written in `toolkit/tests/story/fixtures/habits/`, built from the Epic, Feature and stories of the story-to-code sample's backlog, written in the committed layout and at design level (contracts, failure responses, decisions and the criterion-to-step trace), and the checks' tests SHALL read it. The tests SHALL NOT read the sample's recorded stages. It SHALL NOT contain content from a real backlog or repo.

#### Scenario: Mock passes the checks
- **WHEN** the checks run on the mock slice
- **THEN** they report no problem
