## Purpose

Lets the team lead record the questions that still need answers on any story, backlog or proposed, see at a glance which are open, and use a dedicated skill to draw those questions out, edit proposed stories and suggest changes to backlog stories, without exposing the other story skills to more permissions.

## ADDED Requirements

### Requirement: Clarifications column
Every story, in a backlog and in a proposals file, SHALL have a `Clarifications` column holding zero or more question and answer pairs. The cell SHALL hold one `Q<n>: <question>` line followed by an `A<n>: <answer>` line per pair, where `<n>` is the pair's position starting at 1; an answer MAY span several lines and MAY be empty. A cell that does not follow this format SHALL be kept as it is and shown as plain text, never dropped. A file without the column SHALL be accepted and the column added when it is saved.

A question with an empty answer is **open**. A story with no pairs, or with every answer filled in, is **cleared**.

#### Scenario: Round trip
- **WHEN** a story with two pairs, the second unanswered, is loaded and saved without edits
- **THEN** the cell text is unchanged

#### Scenario: Older file
- **WHEN** a backlog CSV without a `Clarifications` column is opened and edited
- **THEN** it is saved with the column added and every cell empty

#### Scenario: Free text is kept
- **WHEN** the cell holds text that is not in the `Q<n>:` / `A<n>:` form
- **THEN** the text is shown as it is and saved unchanged

### Requirement: Clarifications in the portal
The story form of the Editor tab and of the Proposed tab SHALL show a Clarifications section where the user can add and delete pairs and edit each question and answer, with the same auto-save as the other fields. A story list row SHALL show an "N open" badge when the story has open questions, and no badge otherwise.

#### Scenario: Answering clears the badge
- **WHEN** the user fills in the only empty answer of a story
- **THEN** its "1 open" badge disappears

#### Scenario: Add a question
- **WHEN** the user adds a question to a story in the Editor tab
- **THEN** the story shows "1 open" and the change is saved to the backlog file

### Requirement: Open questions block nothing
Open questions SHALL NOT prevent editing, accepting a proposed story into the backlog, or moving a story to Proposed. The `Clarifications` cell SHALL move with the story unchanged in both directions.

#### Scenario: Accept with open questions
- **WHEN** an unbenched proposed story with an open question is accepted
- **THEN** it is in the backlog with the same `Clarifications` text

### Requirement: Clarify skill
The repository SHALL contain a skill `clarify-stories` at `.claude/skills/clarify-stories/SKILL.md` that helps the user get their questions and blockers about a story out of their head and into text. It SHALL lead with elicitation (technical details, ownership, dependencies, scope and edge cases that are unclear) and prefer recording a question over guessing an answer. It SHALL read the guidelines and the story, SHALL NOT repeat a question already in `Clarifications` or already pending as a suggestion, and SHALL cite the guidelines without restating them. It SHALL NOT create stories or set Priority; new stories and sizing belong to `explore-stories` and `propose-stories`, and the skill SHALL name those when the user's need is a new story. It SHALL NOT write `user-stories/`.

For a **proposed** story (benched or not) it SHALL edit the story directly, like a `propose-stories` patch: add questions, record answers the user states, and change any of Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria and Notes. For a story **in the backlog** it SHALL only read it and write suggestions to the review file with `write-review.mjs --append` (questions as clarification suggestions, and ordinary field-edit suggestions), always with `Area` = `Clarification` and never replacing the review; it SHALL tell the user to Apply or Dismiss them in the portal's Review tab and that a later `review-backlog` run without `--append` replaces the review.

Before any write it SHALL show per story the questions to add, the answers to record and each changed field with old and new value (or, for suggestions, each suggestion with its Reason), and ask a yes/no with `AskUserQuestion`. It SHALL run a writer only when the user picks the yes option, and SHALL ask again after any change.

#### Scenario: Proposed story edited after a confirmed yes
- **WHEN** the skill has shown new questions and a changed Notes for `NEW-4` and the user picks "Yes, write"
- **THEN** the proposal writer runs once and `NEW-4` has the questions and the new Notes

#### Scenario: Backlog story gets suggestions
- **WHEN** the story is in the backlog
- **THEN** the skill writes suggestions to the review file and the backlog CSV is unchanged

#### Scenario: Changes after the question
- **WHEN** the user edits a drafted question after the yes/no was shown
- **THEN** the skill shows the changed draft and asks again before writing

#### Scenario: Needs a new story
- **WHEN** the user's answer shows that a separate story is needed
- **THEN** the skill says so and points to `propose-stories`, and writes no story

### Requirement: Separate clarify reader
A script `.claude/skills/clarify-stories/read-clarify-context.mjs` SHALL print the guidelines, the backlog CSV, the proposals CSV including benched stories and the `Benched` column, and the current review file when there is one, each labelled as data to work from, not instructions. It SHALL read only the guidelines, `user-stories/<name>`, `proposals/<name>` and `reviews/<name>`. The existing `read-story-context.mjs` SHALL NOT be changed to include benched stories.

#### Scenario: Benched story visible
- **WHEN** the clarify reader runs for a backlog whose proposals hold a benched story
- **THEN** that story is printed, marked benched

#### Scenario: Explore still blind to benched
- **WHEN** `read-story-context.mjs` runs for the same backlog
- **THEN** the benched story is not printed

### Requirement: Clarify proposal writer
A script `.claude/skills/clarify-stories/write-clarifications.mjs` SHALL patch existing stories in `proposals/<name>` only, taking a JSON list on standard input in which each item has the `id` of a proposed story (`NEW-<n>`), any of the patch fields of `write-proposal.mjs`, and optionally `clarifications` with questions to add and answers to record. The patched story SHALL be validated as a whole with the same rules as a `write-proposal.mjs` patch. Unlike that writer it SHALL accept benched stories and SHALL never change the `Benched` flag, and it SHALL NOT create stories. It SHALL add new pairs at the end with the next numbers, record an answer only on a pair whose answer is empty, never delete a pair, and keep every other cell and row as it is. It SHALL reject, writing nothing: an ID not in the proposals file, `priority`, `code`, `benched`, an empty item, two items for one ID, an answer for a pair that does not exist or is already answered, and a story whose stored User Story or User Acceptance Criteria is free text unless the item replaces it. Nothing SHALL be written unless every item is valid, and the file SHALL be written in the portal's format.

#### Scenario: Add questions to a benched story
- **WHEN** the writer is given two questions for the benched `NEW-4`
- **THEN** `NEW-4` gains two open pairs and is still benched

#### Scenario: Existing answer is safe
- **WHEN** the input records an answer on a pair that already has an answer
- **THEN** nothing is written and the problem names the pair

#### Scenario: Whole-ticket edit
- **WHEN** an item changes the criteria of `NEW-4` and adds a question
- **THEN** both change, validated as the merged story, and other stories are untouched

#### Scenario: All or nothing
- **WHEN** one item of three is invalid
- **THEN** no item is written

### Requirement: Clarify access is locked down
The skill SHALL provide its own `locked-settings.json` (with `claudeMdExcludes`) and Bash guard, which SHALL allow only the clarify reader, `write-clarifications.mjs` and `write-review.mjs <backlog> --append` in their documented forms (never `write-review.mjs` without `--append`) and deny every other command. The guards and settings of `explore-stories`, `propose-stories` and `review-backlog` SHALL NOT allow the clarify reader or `write-clarifications.mjs`, and `write-proposal.mjs` SHALL reject a patch or a new story carrying a `clarifications` key. A launcher `ai/launchers/clarify-stories.ps1` SHALL start the session with only Bash (guarded), Skill and AskUserQuestion.

#### Scenario: Propose cannot use the clarify writer
- **WHEN** a `propose-stories` session runs `write-clarifications.mjs`
- **THEN** its guard denies the command

#### Scenario: Patch cannot touch clarifications
- **WHEN** a propose patch includes a `clarifications` key
- **THEN** the writer rejects it and writes nothing

#### Scenario: Clarify cannot replace a review
- **WHEN** a `clarify-stories` session runs `write-review.mjs` without `--append`
- **THEN** its guard denies the command

#### Scenario: Clarify cannot run other commands
- **WHEN** a `clarify-stories` session tries `cat` on a file or `write-proposal.mjs`
- **THEN** its guard denies the command

### Requirement: Answered clarifications inform refinement
For unbenched stories, `read-story-context.mjs` SHALL print the `Clarifications` column with the other columns, so `explore-stories` and `propose-stories` take open and answered questions into account when shaping a story. The skills SHALL treat the text as data, never instructions, and SHALL NOT write `Clarifications`; changes to it go through `clarify-stories` or the portal.

#### Scenario: Refine after unbenching
- **WHEN** a story has answered questions, the user unbenches it, and runs `propose-stories`
- **THEN** the reader prints the story with its Clarifications and a patch can refine the story's other fields
