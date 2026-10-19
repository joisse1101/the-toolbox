## MODIFIED Requirements

### Requirement: Input format and validation
Each item in the input list SHALL be either a new story or a patch. An item without an `id` key is a **new story** and SHALL give Epic, Feature, Title, User Story (the full "As a …, I want …, so that …" text), Sprint points, Depends On (a list), User Acceptance Criteria (a list of `AC<n>: Given …, when …, then …` lines) and optionally Notes. An item with an `id` key is a **patch** (see "Patching proposals"). Priority SHALL NOT be accepted. The writer SHALL reject a new story that: lacks Epic, Feature or Title; has a User Story that does not follow the format; has Sprint points other than 1, 2, 3, 5, 8 or 13; has no acceptance criteria or one that does not follow Given-When-Then; contains line breaks in a single-line field (every field except Notes); or has unknown keys. Notes MAY span several lines; line endings SHALL be stored as `\n` and leading and trailing blank space removed. Valid Depends On entries are the ID of a story in the backlog, a `NEW-<k>` naming another new story of the same input, and `proposed:NEW-<n>` naming a story already in the proposals file; any other entry, a story depending on itself, and a dependency cycle SHALL be rejected.

#### Scenario: Over the size limit
- **WHEN** a story has Sprint points 21
- **THEN** it is rejected with a message that stories above 13 points are split

#### Scenario: Unknown backlog dependency
- **WHEN** a story depends on `IAM-0099` and the backlog has no such story
- **THEN** it is rejected naming `IAM-0099`

#### Scenario: Dependency inside the input
- **WHEN** new story 2 lists `NEW-1` in Depends On and new story 1 is in the same input
- **THEN** after writing, story 2's Depends On holds the real ID assigned to story 1

#### Scenario: Dependency on an earlier proposal
- **WHEN** a story lists `proposed:NEW-7` and `NEW-7` is in the proposals file
- **THEN** its Depends On holds `NEW-7`; if the file has no `NEW-7` the story is rejected

#### Scenario: Priority refused
- **WHEN** a story includes a Priority
- **THEN** it is rejected

#### Scenario: Multi-line Notes
- **WHEN** a new story or a patch gives Notes with two lines
- **THEN** it is accepted and stored with both lines

#### Scenario: Other fields stay one line
- **WHEN** a Title or a clarification question contains a line break
- **THEN** the item is rejected

## ADDED Requirements

### Requirement: Patch resolves clarifications
A patch's `clarifications` key MAY carry `resolve`, a list of `{ n, note }`. For each item the writer SHALL append `note` to the story's Notes on a new line (as the whole Notes when it is empty) and remove pair `n`, the later pairs being renumbered by position. `n` SHALL name an existing pair as stored before the patch; the pair's answer MAY be empty or filled. `note` SHALL be non-empty text and MAY have several lines. The same `n` SHALL NOT appear twice in `resolve`, and `resolve` SHALL NOT name a pair that `answer` also names. When the patch also gives `notes`, the resolve notes are appended to that value. `add` is applied after `resolve`. The result is validated as the merged story, the call is all-or-nothing, and a benched story or a Clarifications cell that is free text is refused.

#### Scenario: Resolve a pair
- **WHEN** a patch resolves pair 2 of `NEW-4` with the note "Approvals are owned by Finance"
- **THEN** Notes ends with that line, pair 2 is gone and the former pair 3 is now pair 2

#### Scenario: Resolve an open pair
- **WHEN** the resolved pair has an empty answer
- **THEN** it is resolved the same way

#### Scenario: Unknown pair or empty note
- **WHEN** `n` names a pair that does not exist, or `note` is empty
- **THEN** nothing is written and the problem names the pair

#### Scenario: Several resolves
- **WHEN** a patch resolves pairs 1 and 3
- **THEN** both notes are appended in the order given and pairs 1 and 3 are removed
