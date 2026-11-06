# Spec Delta

## MODIFIED Requirements

### Requirement: Conflicts are offered a way to be fixed
When the skill finds a conflict between stories, between a story and the lexicon, or between a story and a page of the project's wiki, that the user wants to settle, it SHALL name the stories by Title (and the wiki page by its path under `wiki/`), say what would change in each, and offer two ways forward: the change through `jois-story-propose` (for a wiki page, a `Changes existing spec` line in the story's Notes, see `story-contradiction-rule`), or an entry in the slice's `Open questions` section when the user wants to decide later. A decision that a page changes SHALL also become a row of the slice's `## Changes to existing specs`.

#### Scenario: Conflict the user wants to fix now
- **WHEN** two stories in scope contradict each other and the user chooses to fix it
- **THEN** the skill offers `jois-story-propose`, and after the change is written it says the user must apply it in the portal and that the slice will be STALE until redrawn

#### Scenario: Conflict the user defers
- **WHEN** the user does not want to change a story yet
- **THEN** the skill records the conflict in the slice's `Open questions` and changes no story

#### Scenario: Conflict with a wiki page
- **WHEN** a story in scope contradicts a wiki page and the user decides the story stands
- **THEN** the skill names the page by its path under `wiki/`, offers the Notes line through `jois-story-propose`, and the slice's `## Changes to existing specs` holds a row for that page

## ADDED Requirements

### Requirement: The slice states its changes to existing specs
The skill SHALL draft `## Changes to existing specs` in every slice from the `Changes existing spec` Notes lines of the stories in scope and the user's answers, and SHALL write `None` when no spec changes. It SHALL NOT edit a wiki page and SHALL NOT mark a change as applied.

#### Scenario: Slice with no spec change
- **WHEN** no story in scope changes an existing spec
- **THEN** the section reads `None`

#### Scenario: Skill does not edit the wiki
- **WHEN** a row says a wiki page is modified
- **THEN** the page is unchanged after the slice is written

### Requirement: Spec decisions are asked at the design checkpoint
The skill SHALL put a wiki page that a story in scope contradicts and that no `Changes existing spec` Notes line records into the design checkpoint's questions, so the user answers before the slice document is shown. It SHALL treat a story with a `Supersedes` line as a new story that is not frozen: it is planned only after it is accepted into the backlog, and the slice freezes it only when the slice covers it and the user confirms.

#### Scenario: Unrecorded wiki contradiction at the checkpoint
- **WHEN** a story in scope contradicts a wiki page and no Notes line records it
- **THEN** the question about the page is asked at the design checkpoint, before the document is shown

#### Scenario: Superseding story is not frozen by the slice
- **WHEN** a story with a `Supersedes` line is accepted into the backlog and planned
- **THEN** it is not frozen until a slice that covers it is confirmed, and the superseded story stays frozen and unmarked
