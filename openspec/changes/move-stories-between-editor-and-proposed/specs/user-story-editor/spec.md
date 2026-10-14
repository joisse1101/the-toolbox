## ADDED Requirements

### Requirement: Move to Proposed button
The story form SHALL show a **Move to Proposed** button in the same row as the story ID. It SHALL appear only in the Editor tab's form, not in the Proposed tab's, and SHALL act on the open story only. Its behavior is defined by the story-proposals and backlog-review-suggestions capabilities.

#### Scenario: Button placement
- **WHEN** a story with an ID is open in the Editor tab
- **THEN** Move to Proposed is shown beside `ID: <code>`

#### Scenario: Not in the Proposed tab
- **WHEN** a story is open in the Proposed tab
- **THEN** the form has no Move to Proposed button
