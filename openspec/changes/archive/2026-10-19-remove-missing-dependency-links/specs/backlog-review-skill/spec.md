## ADDED Requirements

### Requirement: Dependency problems are removed by a row
For every dependency problem the checks report on a submitted story (a link to a story that does not exist, to the story itself, to a story that is still proposed, or part of a cycle), the skill SHALL write a `remove` row on `Depends On` with Area `INVEST`, naming the entry to remove in `Suggested`. For a link to a story that is still proposed, the Reason SHALL say the link comes back by hand when the proposal is accepted. For a link to a story that does not exist, the Reason SHALL say what the entry was probably meant to be when the review can tell, but the row SHALL still be a `remove`. The skill SHALL NOT write a Clarifications question in place of the `remove` for these problems.

#### Scenario: Link to a story that does not exist
- **WHEN** the checks report that `Depends On` lists `IAM-0099`, which does not exist
- **THEN** the skill writes a `remove` row on `Depends On` with `Suggested` `IAM-0099` and Area `INVEST`

#### Scenario: Link to a story that is still proposed
- **WHEN** the checks report that `Depends On` lists `NEW-4`, a story that is still proposed
- **THEN** the skill writes a `remove` row with `Suggested` `NEW-4`, and its Reason says the dependency comes back when the proposal is accepted

#### Scenario: Link to the story itself
- **WHEN** the checks report that a story lists its own code in `Depends On`
- **THEN** the skill writes a `remove` row for that entry, not a Clarifications question
