## ADDED Requirements

### Requirement: Review suggestions are part of the editor
The story form, story list and Review tab SHALL display and apply review suggestions as described by the `backlog-review-suggestions` capability. Applying a suggestion SHALL be treated as an edit: it SHALL be autosaved like any other edit, SHALL keep story IDs derived from Epic and position, and SHALL keep `Depends On` links following their stories.

#### Scenario: Applied suggestion is saved
- **WHEN** the user applies a suggestion that changes a story's Epic
- **THEN** the story is renumbered, links to it are rewritten, and the backlog autosaves as it does for a manual Epic change
