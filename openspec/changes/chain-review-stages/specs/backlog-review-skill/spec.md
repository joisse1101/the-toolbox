## ADDED Requirements

### Requirement: Findings mode for a calling skill
When another skill calls `jois-story-review` with the Skill tool and a scope (a list of stories, by Title and ID, that the caller just wrote), the skill SHALL run in findings mode: it SHALL review only the stories of that scope, using the rest of the backlog, the lexicon and the proposals as context, SHALL NOT run `write-review.mjs` or any other writer, and SHALL return its findings to the caller as a list. Each finding SHALL carry the story by Title, the field, the suggested edit, the reason, the area and the confidence (`ready` or `confirm`), in the shape of a review row. When a user runs the skill directly, it SHALL behave as before and write the review file.

#### Scenario: Called by another skill
- **WHEN** `jois-story-propose` calls review with the Titles of three stories it just wrote
- **THEN** review reads and checks those three stories, writes no file, and returns the findings as rows with a confidence each

#### Scenario: Run by the user
- **WHEN** the user runs `/jois-story:review` on a backlog
- **THEN** review reviews every submitted story and writes `review.csv` as before

#### Scenario: Scope names a proposed story
- **WHEN** the scope holds a proposed story with a `NEW-<n>` ID
- **THEN** review checks it like a backlog story and its findings name the `NEW-<n>` ID so the caller can patch it
