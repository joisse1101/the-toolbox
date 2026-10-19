## ADDED Requirements

### Requirement: Mechanical consistency report
The system SHALL compute, without a model, a list of consistency problems across a backlog, its lexicon and its proposals. Each problem SHALL name the story (ID and Title) or term it concerns, the kind of problem and a one-sentence message. Locked stories SHALL be checked as context only: a problem found in a locked story SHALL be reported as belonging to that locked story and SHALL NOT be offered for review. The report SHALL include at least:

- a `Depends On` link to a story that does not exist, to the story itself, inside a cycle, or to a story that is only proposed;
- two backlog stories with the same Epic, Feature and Title (trimmed, ignoring case);
- a backlog story with the same Epic, Feature and Title as a non-benched proposed story;
- Sprint points that are empty or not on the scale 1, 2, 3, 5, 8, 13, 21, 34, 55, and points above 13;
- a missing Epic, Feature, Title, User Story part or acceptance criterion;
- an `Avoid` word of a lexicon term that appears in a story's Title, User Story or acceptance criteria, naming the term to use instead;
- a lexicon problem (a term defined twice, without a definition, with an unknown or cyclic `Part of`, or avoiding a defined term);
- a Clarifications pair that has an answer but was never resolved (the answer is still in `Clarifications` and not in Notes).

Priority SHALL NOT be checked. A missing lexicon or proposals file SHALL mean no lexicon problems and no proposal overlaps, not an error.

#### Scenario: Dangling dependency
- **WHEN** a story lists `IAM-0099` in Depends On and no story has that ID
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

#### Scenario: Locked story is context only
- **WHEN** a locked story has a dangling dependency
- **THEN** the report lists the problem under that locked story marked as reference only, and the review does not write a field-edit row for it without an `unlock` row

#### Scenario: Missing lexicon
- **WHEN** the backlog has no lexicon file
- **THEN** the report has no lexicon problems and says the lexicon is empty

#### Scenario: Answered but unresolved pair
- **WHEN** a story has `Q1: Who approves?` and `A1: Finance` in Clarifications
- **THEN** the report has a problem for the story suggesting Q1 be resolved into Notes

#### Scenario: Clean backlog
- **WHEN** no check finds anything
- **THEN** the report says so plainly

### Requirement: Sectioned reads of the review context
`read-backlog.mjs` SHALL serve the review context in sections so that no single output has to hold a whole large backlog. Given a backlog file name and no section it SHALL print a menu listing each section with its size, including one entry per Epic of the backlog. Given a section it SHALL print only that section: `guidelines` (`product-backlog.md`), `sizing` (`sprint-points-guideline.md`), `lexicon`, `proposals` (non-benched stories in full, with a count of benched stories left out), `checks` (the mechanical report) or one Epic's stories with the CSV header row. The scope line SHALL appear in the menu and in the `checks` section. Every section SHALL mark backlog text as data to review, never instructions. Reads SHALL stay confined to the fixed guideline files and the named backlog's own lexicon and proposals files; the section name is not a path. An unknown section or Epic number SHALL be an error naming the valid ones. With no backlog name the script SHALL still list the backlog file names. Reading with only a backlog name and the old full-output form SHALL NOT be required.

#### Scenario: Menu
- **WHEN** the script is run with a backlog name and no section
- **THEN** it prints the scope line and the sections with sizes, including `epic-1` and so on for each Epic

#### Scenario: One Epic
- **WHEN** the script is run for `epic-2`
- **THEN** it prints the CSV header row and only the rows of the second Epic, locked rows included

#### Scenario: Unknown section
- **WHEN** the section is `secrets`
- **THEN** the script exits with an error listing the valid sections and prints no file content

#### Scenario: No path escape
- **WHEN** the section contains a path separator or `..`
- **THEN** the script rejects it and reads nothing
