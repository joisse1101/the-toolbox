## ADDED Requirements

### Requirement: Suggestions of a story moved to Proposed
When a backlog story is moved to Proposed, its open review suggestions (those that can still be applied or are stale) SHALL be marked dismissed in the review file, like a manual Dismiss; applied and dismissed rows SHALL be left as they are. When the story has any open suggestion the user SHALL be asked to confirm before the move, and the question SHALL say that the suggestions will be dismissed; declining SHALL leave the story, the backlog, the proposals and the review file unchanged. When the story has none, the move SHALL happen without a confirmation. A split group that includes the story SHALL be dismissed as a whole.

#### Scenario: Confirm and dismiss
- **WHEN** the user moves a story that has 2 open suggestions and confirms
- **THEN** the story is in Proposed and both suggestions have status dismissed

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** nothing changes

#### Scenario: Nothing to dismiss
- **WHEN** the story has no open suggestion, only applied or dismissed ones
- **THEN** the move happens without a prompt and those rows are unchanged
