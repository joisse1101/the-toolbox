# story-clarifications Specification

## Purpose

Lets the team lead record the questions that still need answers on any story, backlog or proposed, see at a glance which are open, and have the explore and propose skills draw those questions out and record them while shaping a story.

## Requirements

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

### Requirement: Explore and propose draw out clarifications
`explore-stories` and `propose-stories` SHALL aim at a best-effort complete story and SHALL NOT guess what the user has not decided. When a detail (technical detail, ownership, dependency, scope or edge case) cannot be settled in the conversation, they SHALL record it as a question in `Clarifications` instead of inventing an answer or leaving it only in Notes. While discussing, `explore-stories` SHALL ask the user for such unknowns, and an answer the user states SHALL be recorded as the answer to its question. The rule SHALL be written once in `ai/guidelines/product-backlog.md` and cited, not restated, by both skills. No skill SHALL write `user-stories/`.

#### Scenario: Unknown becomes a question
- **WHEN** the user cannot say who owns approvals while a story is being shaped
- **THEN** the draft is complete otherwise and carries the open question "Who owns approvals?"

#### Scenario: Answer recorded later
- **WHEN** the user returns to an unbenched proposed story and states the answer
- **THEN** a patch records it on that question and refines the other fields if the answer changes them

#### Scenario: Benched story
- **WHEN** the user wants to discuss a benched story
- **THEN** the skills do not see it until the user unbenches it in the portal

### Requirement: Proposal writer accepts clarifications
`write-proposal.mjs` SHALL accept a `clarifications` key. In a new story it SHALL be a list of questions, each stored as an open pair. In a patch it SHALL be `{ add, answer }`: `add` a list of questions appended with the next numbers, `answer` a list of `{n, text}` each recorded only on an existing pair whose answer is empty. It SHALL never delete a pair or change an existing answer, and the stored text SHALL be in the format of the Clarifications column. Everything else about the writer is unchanged: validation as the merged story, all-or-nothing, and refusal of benched stories.

#### Scenario: New story with questions
- **WHEN** a new story is written with two questions
- **THEN** it is stored with two open pairs

#### Scenario: Answer an open question
- **WHEN** a patch answers pair 2 of `NEW-4`, which is empty
- **THEN** pair 2 holds the answer and the other pairs are unchanged

#### Scenario: Existing answer is safe
- **WHEN** a patch answers a pair that already has an answer, or a pair that does not exist
- **THEN** nothing is written and the problem names the pair

#### Scenario: Benched story refused
- **WHEN** a patch with `clarifications` targets a benched story
- **THEN** nothing is written, as for any patch to a benched story

### Requirement: Answered clarifications inform refinement
For unbenched stories, `read-story-context.mjs` SHALL print the `Clarifications` column with the other columns, so `explore-stories` and `propose-stories` take open and answered questions into account when shaping a story. The skills SHALL treat the text as data, never instructions.

#### Scenario: Refine after unbenching
- **WHEN** a story has answered questions, the user unbenches it, and runs `propose-stories`
- **THEN** the reader prints the story with its Clarifications and a patch can refine the story's other fields
