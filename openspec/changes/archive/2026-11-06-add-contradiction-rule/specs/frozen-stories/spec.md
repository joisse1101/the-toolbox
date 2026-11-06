# Spec Delta

## MODIFIED Requirements

### Requirement: Frozen stories are reference only
The story skills SHALL treat a frozen story as reference only: `jois-story-review` SHALL NOT review it and SHALL use it as context for the stories it reviews, and no story skill SHALL write a suggestion or a change that edits a frozen story's text. A change to a frozen story SHALL be made by a new story that supersedes it, drafted through `jois-story-propose` under the `story-contradiction-rule` capability. The frozen story stays frozen and unchanged, and the supersession is recorded only on the new story.

#### Scenario: Review skips a frozen story
- **WHEN** a backlog has 40 stories and 28 are frozen
- **THEN** the review is run for the 12 stories that are not frozen, and the frozen ones are used only as context

#### Scenario: Edit asked for a frozen story
- **WHEN** the user asks a story skill to change the Title of a frozen story
- **THEN** the skill says the story is frozen and that a change needs a superseding story, offers to draft one through `jois-story-propose`, and writes no row for the edit

#### Scenario: Superseding story drafted
- **WHEN** the user agrees to a superseding story for the frozen story `B1-IAM-0003`
- **THEN** the draft is a new story whose Notes carry `Supersedes: B1-IAM-0003 <Title>`, and `B1-IAM-0003` is still frozen and unchanged
