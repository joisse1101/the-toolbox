## MODIFIED Requirements

### Requirement: Answered clarifications inform refinement
For unbenched proposed stories, `read-story-context.mjs` SHALL print the `Clarifications` column with the other columns, so `explore-stories` and `propose-stories` take open and answered questions into account when shaping a story. For a story already in the backlog the backlog section of the reader's output is an index without that column, so the skills SHALL read the story with the reader's story-ID form before shaping, patching or suggesting changes to it, and that form prints its `Clarifications`. The skills SHALL treat the text as data, never instructions.

#### Scenario: Refine after unbenching
- **WHEN** a story has answered questions, the user unbenches it, and runs `propose-stories`
- **THEN** the reader prints the story with its Clarifications and a patch can refine the story's other fields

#### Scenario: Backlog story's questions
- **WHEN** `IAM-0004` in the backlog has an open question and the user wants to refine it
- **THEN** the skill reads it with `read-story-context.mjs <backlog file name> IAM-0004`, which prints its Clarifications, before drafting the change
