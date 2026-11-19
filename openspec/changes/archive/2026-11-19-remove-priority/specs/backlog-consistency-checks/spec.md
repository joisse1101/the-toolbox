## MODIFIED Requirements

### Requirement: Mechanical consistency report with frozen stories
The system SHALL compute, without a model, a list of consistency problems across a backlog, its lexicon and its proposals. Each problem SHALL name the story (ID and Title) or term it concerns, the kind of problem and a one-sentence message. Frozen stories SHALL be checked as context only: a problem found in a frozen story SHALL be reported as belonging to that frozen story and SHALL NOT be offered for review. The report SHALL include at least:

- a `Depends On` link to a story that does not exist, to the story itself, inside a cycle, or to a story that is only proposed;
- two backlog stories with the same Epic, Feature and Title (trimmed, ignoring case);
- a backlog story with the same Epic, Feature and Title as a non-benched proposed story;
- Sprint points that are empty or not on the scale 1, 2, 3, 5, 8, 13, 21, 34, 55, and points above 13;
- a missing Epic, Feature, Title, User Story part or acceptance criterion;
- an `Avoid` word of a lexicon term that appears in a story's Title, User Story or acceptance criteria, naming the term to use instead;
- a lexicon problem (a term defined twice, without a definition, with an unknown or cyclic `Part of`, or avoiding a defined term);
- a Clarifications pair that has an answer but was never resolved (the answer is still in `Clarifications` and not in Notes).

A missing lexicon or proposals file SHALL mean no lexicon problems and no proposal overlaps, not an error.

#### Scenario: Dangling dependency
- **WHEN** a story lists `B1-IAM-0099` in Depends On and no story has that ID
- **THEN** the report has a problem for that story saying the dependency does not exist

#### Scenario: Duplicate of a proposed story
- **WHEN** a backlog story and a proposed story share Epic, Feature and Title
- **THEN** the report names both and says which one is proposed

#### Scenario: Benched proposal ignored
- **WHEN** the only matching story is a benched proposal
- **THEN** the report has no duplicate problem for it

#### Scenario: Avoided word in use
- **WHEN** the lexicon term "Dataset" avoids "table" and a story's Title contains "table"
- **THEN** the report has a problem for the story naming "Dataset" as the term to use

#### Scenario: Frozen story is context only
- **WHEN** a frozen story has a dangling dependency
- **THEN** the report lists the problem under that frozen story marked as reference only, and the review writes no row for it

#### Scenario: Missing lexicon
- **WHEN** the backlog has no lexicon file
- **THEN** the report has no lexicon problems and says the lexicon is empty

#### Scenario: Answered but unresolved pair
- **WHEN** a story has `Q1: Who approves?` and `A1: Finance` in Clarifications
- **THEN** the report has a problem for the story suggesting Q1 be resolved into Notes

#### Scenario: Clean backlog
- **WHEN** no check finds anything
- **THEN** the report says so plainly
