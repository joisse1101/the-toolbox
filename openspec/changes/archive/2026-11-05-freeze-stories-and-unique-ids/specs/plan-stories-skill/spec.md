## MODIFIED Requirements

### Requirement: Draft, confirm, write
The skill SHALL read the guidelines for diagrams (`diagram-conventions`, from the skill's own `references/` folder), the stories in scope with every column, the backlog's lexicon and any existing slice for that scope, hold the design checkpoint, then show the complete final text of the slice's document, diagrams included, in one reply (shown whole in sections, with the yes/no asked once every section has been shown, when it is too long for one reply), run the slice writer with `--check` and fix what it reports, ask one yes/no, and run the slice writer without `--check` only after the user confirms. Before it asks, the skill SHALL state which stories the slice covers will be frozen by the confirmation, which of them are already frozen, and which cannot be frozen because they have no ID, so the one yes/no covers writing the slice and freezing its stories. After the write it SHALL read the slice back with the skill's slice read script in the same turn and call it written only when the read-back matches. Only then SHALL it freeze the stories, as the `frozen-stories` capability describes, and it SHALL NOT freeze any story when the slice write was rejected or its read-back did not match. A rejected write SHALL be fixed and resent; a write is never reported on the writer's reply alone.

#### Scenario: Nothing is written before the yes
- **WHEN** the user has not answered the yes/no
- **THEN** the slice writer has not been run without `--check` and no story is frozen

#### Scenario: Read-back mismatch
- **WHEN** the slice read back differs from what was sent
- **THEN** the skill says what is missing and sends only that part, and no story is frozen until the read-back matches

#### Scenario: Document too long for one reply
- **WHEN** the document is too long to show in one reply
- **THEN** the skill says so up front, shows each section whole, and asks the yes/no only after the last

#### Scenario: The question names what will be frozen
- **WHEN** the skill is about to ask the yes/no for a slice that covers four stories, one already frozen and one without an ID
- **THEN** the reply before the question says that two stories will be frozen, that one is already frozen and that one cannot be frozen for lack of an ID

#### Scenario: Frozen after the confirmed write
- **WHEN** the user answers yes and the slice read-back matches
- **THEN** the skill freezes the stories the slice covers and reads the backlog back before it calls them frozen

#### Scenario: Rejected slice freezes nothing
- **WHEN** the slice writer rejects the write after the yes
- **THEN** no story is frozen, and the skill fixes the slice and asks again

### Requirement: Never writes outside diagrams
The skill itself SHALL write only the slice and the context map, and one more thing: the `Frozen` flag of the stories a confirmed slice covers (see `frozen-stories`). It SHALL write them through its own writer scripts, and the freeze SHALL happen only after the user confirms and only through its own validated freeze writer, which changes no other cell of the backlog. It SHALL NOT write the proposals, the reviews, the lexicon or anything in the target repo, SHALL NOT change any field of a story other than the `Frozen` flag, and SHALL NOT run the writer scripts of the other story skills itself. A change to a story or a term is made by `jois-story-propose` (or `/jois-story:propose`), loaded in the same session, under its own checks and yes/no.

#### Scenario: Asked to change a story
- **WHEN** the user asks to change a story during the session
- **THEN** the skill does not change it itself; it offers `jois-story-propose` for the change and, once the user agrees, loads it

#### Scenario: The skill never calls a story writer
- **WHEN** the skill is drafting, checking or writing a slice
- **THEN** it runs no writer of `jois-story-propose` or `jois-story-review`

#### Scenario: Freeze after the confirm
- **WHEN** the user confirms a slice that covers `B1-IAM-0001` and `B1-IAM-0002`
- **THEN** after the slice is written the skill runs its freeze writer for those two stories, and the backlog differs only in their `Frozen` cells

#### Scenario: Freeze refused for a story with no ID
- **WHEN** a slice covers a story with no ID
- **THEN** the freeze writer refuses that story, the story stays not frozen, and the skill tells the user which story it could not freeze and why

#### Scenario: Asked to edit story text
- **WHEN** the user asks the skill to reword a story's acceptance criterion, whether or not the story is frozen
- **THEN** the skill writes nothing to the story and offers `jois-story-propose` for the change; for a frozen story it also says that a change needs a superseding story
