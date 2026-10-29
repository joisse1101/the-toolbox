## ADDED Requirements

### Requirement: Draw the context map
The skill SHALL have a step that draws the context map, entered when the user asks for it or agrees to it for a backlog that has Epics and no map. It SHALL start from one context per Epic, advise the user which Epics share terms and meaning and could merge, with a reason drawn from the lexicon and the stories, and leave every merge to the user. It SHALL ask the user for the owner of each context and for the type and content of each relationship, and SHALL NOT fill them with a default: a point the user defers is written `TBC`. It SHALL show the complete map, check it, ask one yes/no and call the map write only after the user confirms, then read the map back and call it written only when the read-back matches.

#### Scenario: Two Epics share a term
- **WHEN** two Epics define the same term with the same meaning
- **THEN** the skill proposes merging them into one context, says why, and merges only if the user agrees

#### Scenario: Owner not known
- **WHEN** the user does not know a context's owner
- **THEN** the owner is written `TBC` and the skill does not invent one

#### Scenario: Nothing written before the yes
- **WHEN** the user has not answered the yes/no
- **THEN** no map write has been made

### Requirement: Use of the context map
When the backlog has a context map, the skill SHALL read it before drafting a slice, SHALL draw an entity owned by another context as a stub that states the relationship type, and SHALL tell the user when the map is out of step with the backlog's Epics. The map SHALL NOT change the scope the skill recommends for a slice. When there is no map the skill SHALL work as before.

#### Scenario: Entity from another context
- **WHEN** a slice needs an entity that the map puts in another context
- **THEN** the skill draws a stub and names the relationship type of the two contexts

#### Scenario: Map is stale
- **WHEN** the backlog has an Epic that the map does not list
- **THEN** the skill says which Epic and offers to update the map, and carries on with the slice

## MODIFIED Requirements

### Requirement: Tools available to the session
The session SHALL read the backlog only through `backlog-tools --read-only` (`read_context`, `search_stories`, `read_file`) and SHALL read and write diagrams and the context map only through `diagram-tools`. The writers of the story skills (`write_proposals`, `write_lexicon`, `suggest_lexicon_change`, `write_review`) SHALL NOT be available. The tools that write nothing, the map's read and check among them, SHALL be pre-approved, and `write_diagram` and the map write SHALL NOT be, so Claude Code asks before every write.

#### Scenario: A story writer is not offered
- **WHEN** the session lists its tools
- **THEN** none of the four story writers is among them

#### Scenario: A write asks for permission
- **WHEN** the skill calls `write_diagram` or the map write
- **THEN** Claude Code asks the user before the call runs
