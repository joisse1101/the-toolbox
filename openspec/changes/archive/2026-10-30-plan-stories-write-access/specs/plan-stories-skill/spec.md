## REMOVED Requirements

### Requirement: Tools available to the session
**Reason**: It said the four story writers SHALL NOT be available, which kept a conflict found while planning from being fixed in the session (GitHub issue #42). Replaced by "Tools of the plan session".
**Migration**: See "Tools of the plan session": the session has the full `backlog-tools`, `check_drafts` pre-approved and the writers prompted.

## MODIFIED Requirements

### Requirement: Never writes outside diagrams
The skill itself SHALL write only the slice and the context map. It SHALL NOT write the backlog, the proposals, the reviews, the lexicon, `repo.json` or anything in the target repo, and SHALL NOT call a story writer (`write_proposals`, `write_lexicon`, `suggest_lexicon_change`, `write_review`). A change to a story or a term is made by `propose-stories` (or `/story:propose`), loaded in the same session, under its own checks and yes/no.

#### Scenario: Asked to change a story
- **WHEN** the user asks to change a story during the session
- **THEN** the skill does not change it itself; it offers `propose-stories` for the change and, once the user agrees, loads it

#### Scenario: The skill never calls a story writer
- **WHEN** the skill is drafting, checking or writing a slice
- **THEN** it makes no call to `write_proposals`, `write_lexicon`, `suggest_lexicon_change` or `write_review`

## ADDED Requirements

### Requirement: Tools of the plan session
The session SHALL read and write the backlog's story data only through the full `backlog-tools` server (the readers `read_context`, `search_stories` and `read_file`, `check_drafts`, and the writers `write_proposals`, `write_lexicon`, `suggest_lexicon_change` and `write_review`), so a conflict found while planning can be fixed with `propose-stories` in the same session, and SHALL read and write diagrams and the context map only through `diagram-tools`.

#### Scenario: The story tools are offered
- **WHEN** the session lists its tools
- **THEN** `check_drafts` and the four story writers are among them, next to the readers and the `diagram-tools` tools

### Requirement: Pre-approval of the plan session's tools
The tools that write nothing, `check_drafts` and the map's read and check among them, SHALL be pre-approved. `write_diagram`, the map write and the four story writers SHALL NOT be, so Claude Code asks before every write.

#### Scenario: A write asks for permission
- **WHEN** the skill calls `write_diagram` or the map write, or `propose-stories` calls one of the four story writers
- **THEN** Claude Code asks the user before the call runs

#### Scenario: Check needs no prompt
- **WHEN** `propose-stories` calls `check_drafts` in the session
- **THEN** the call runs without a permission prompt and writes nothing

### Requirement: Conflicts are offered a way to be fixed
When the skill finds a conflict between stories, or between a story and the lexicon, that the user wants to settle, it SHALL name the stories by Title, say what would change in each, and offer two ways forward: the change through `propose-stories`, or an entry in the slice's `Open questions` section when the user wants to decide later.

#### Scenario: Conflict the user wants to fix now
- **WHEN** two stories in scope contradict each other and the user chooses to fix it
- **THEN** the skill offers `propose-stories`, and after the change is written it says the user must apply it in the portal and that the slice will be STALE until redrawn

#### Scenario: Conflict the user defers
- **WHEN** the user does not want to change a story yet
- **THEN** the skill records the conflict in the slice's `Open questions` and changes no story

### Requirement: The user is told what a story change needs
After the user agrees to a change, the skill SHALL tell the user that a review row on a story already in the backlog takes effect only when the user applies it in the portal, that a proposed story is added only on Accept, and that the slice shows STALE once the story changes, to be redrawn after the user's `/story:re-read`. It SHALL NOT draw the slice as if the change had already been applied.

#### Scenario: Unapplied change
- **WHEN** a review row has been written but not applied in the portal
- **THEN** the slice is drawn from the stories as they are in the backlog now
