## ADDED Requirements

### Requirement: Re-read command
The command `/story:re-read` SHALL make the session re-read, through `read_context` only, the `index`, `proposals` and `lexicon` sections and the counts of `reviews` and `lexicon-suggestions` for the session's backlog, and SHALL read in full each story under discussion. It SHALL skip `guidelines` unless the user's arguments ask for it, and SHALL narrow to the section or story the arguments name. It SHALL look a story up by its Title first, because backlog IDs shift; a story whose Title is gone SHALL be reported, not guessed. It SHALL then tell the user, naming stories by Title, what differs from what the session knew before, mark drafts in the conversation that the change makes stale as superseded, and continue the session. It SHALL NOT write any file.

#### Scenario: Story edited in the portal
- **WHEN** the user changes the acceptance criteria of a story under discussion in the portal and runs `/story:re-read`
- **THEN** the session reads that story again and reports which criteria changed, and later replies use the new text

#### Scenario: Story renamed
- **WHEN** the Title of a story under discussion no longer exists in the backlog or proposals
- **THEN** the session says so and asks which story is meant instead of guessing

#### Scenario: Narrowed by argument
- **WHEN** the user runs `/story:re-read lexicon`
- **THEN** only the lexicon is re-read and compared

### Requirement: Review command
The command `/story:review` SHALL audit, read-only, only what is under discussion: the stories shaped in the session (backlog or proposed), their dependencies in both directions, the lexicon terms they use or the session changed, and what the session wrote (proposal rows, review rows, lexicon entries and term suggestions). It SHALL re-read the context first, use `check_drafts` to validate drafts agreed but not yet written, and check at least: agreed drafts against what is written, `Avoid` words used in those stories, `Depends On` links to missing, benched or renumbered stories, size over the guidelines' cap, open Clarifications, stale review rows, field edits on a locked story without an `unlock` row, and suggestions still waiting to be applied in the portal. It SHALL end with a checklist grouped by who acts (the user in the portal, the session via `/story:propose`, a decision needed), or state that everything is in sync. It SHALL NOT review stories outside that scope, only point to `review-backlog` for a wider check, and SHALL NOT write any file.

#### Scenario: Agreed edit not written
- **WHEN** the session agreed a change to a backlog story but no review row exists for it
- **THEN** the checklist lists it under the session's actions, to be written with `/story:propose`

#### Scenario: Suggestion waiting
- **WHEN** a written lexicon suggestion for a term the stories use is still open
- **THEN** the checklist lists it under the user's actions in the portal's Lexicon tab

#### Scenario: Problem outside the scope
- **WHEN** an unrelated story breaks a guideline
- **THEN** it is not listed; at most one line suggests `review-backlog`
