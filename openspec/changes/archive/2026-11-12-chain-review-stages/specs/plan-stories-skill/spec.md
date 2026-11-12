## MODIFIED Requirements

### Requirement: Draft, confirm, write
The skill SHALL read the guidelines for diagrams (`diagram-conventions`, from the skill's own `references/` folder), the stories in scope with every column, the backlog's lexicon and any existing slice for that scope, hold the design checkpoint, then show the complete final text of the slice's document, diagrams included, in one reply (shown whole in sections, with the yes/no asked once every section has been shown, when it is too long for one reply), run the slice writer with `--check` and fix what it reports, ask one yes/no, and run the slice writer without `--check` only after the user confirms. Before it asks, the skill SHALL state which stories the slice covers will be frozen by the confirmation, which of them are already frozen, and which cannot be frozen because they have no ID, so the one yes/no covers writing the slice, correcting it after verify, and freezing its stories once verify finds nothing critical. After the write it SHALL read the slice back with the skill's slice read script in the same turn and call it written only when the read-back matches. It SHALL then run `jois-story-verify` on the slice (see "The slice is verified before it is frozen"). Only after the verify stage SHALL it freeze the stories, as the `frozen-stories` capability describes, and it SHALL NOT freeze any story when the slice write was rejected, its read-back did not match, or verify reported a critical finding that is still open. A rejected write SHALL be fixed and resent; a write is never reported on the writer's reply alone.

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
- **THEN** the reply before the question says that two stories will be frozen once verify finds nothing critical, that one is already frozen and that one cannot be frozen for lack of an ID

#### Scenario: Frozen after the confirmed write
- **WHEN** the user answers yes, the slice read-back matches and verify leaves no critical finding open
- **THEN** the skill freezes the stories the slice covers and reads the backlog back before it calls them frozen

#### Scenario: Rejected slice freezes nothing
- **WHEN** the slice writer rejects the write after the yes
- **THEN** no story is frozen, and the skill fixes the slice and asks again

## ADDED Requirements

### Requirement: The slice is verified before it is frozen
After the read-back of a written slice matches, `jois-story-plan` SHALL load `jois-story-verify` with the Skill tool and run it on that slice, and its `allowed-tools` SHALL include `Skill`. A problem that belongs to the slice (a missing task, a wrong step id, a failing check) SHALL be corrected through `write-diagram.mjs` without a second yes/no, then read back and verified again, up to 2 rounds. A finding that belongs to a story, a `TBC` decision, an open clarification question or a project-check warning SHALL NOT be auto-fixed; plan SHALL list it in its report with the owner verify names. Plan SHALL freeze the stories only when no critical finding is open. When a critical finding stays open, it SHALL freeze nothing and SHALL say which finding blocks the freeze and what the user can do. When `jois-story-verify` is not installed, plan SHALL say verify was not run and why, SHALL NOT count it as passed, and SHALL freeze nothing until the user says to freeze without it.

#### Scenario: A slice problem is corrected and the stories freeze
- **WHEN** verify finds a criterion with no task and the corrected slice passes the second verify
- **THEN** plan writes the corrected slice, reads it back, reports the correction, and freezes the stories

#### Scenario: A critical finding stays open
- **WHEN** the second verify round still reports a failing diagram check
- **THEN** plan freezes no story, names the finding, and ends without a further write

#### Scenario: Open decisions do not block the freeze
- **WHEN** verify reports only a `TBC` decision and an open clarification question, both warnings
- **THEN** plan lists them in its report and freezes the stories

#### Scenario: Verify not installed
- **WHEN** `jois-story-verify` is not installed
- **THEN** plan says verify was not run, freezes nothing, and asks whether to freeze without it
