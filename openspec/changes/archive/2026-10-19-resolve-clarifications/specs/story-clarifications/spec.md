## MODIFIED Requirements

### Requirement: Proposal writer accepts clarifications
`write-proposal.mjs` SHALL accept a `clarifications` key. In a new story it SHALL be a list of questions, each stored as an open pair. In a patch it SHALL be `{ add, answer, resolve }`: `add` a list of questions appended with the next numbers, `answer` a list of `{n, text}` each recorded only on an existing pair whose answer is empty, and `resolve` a list of `{n, note}` that moves a pair into Notes (see "Resolve a clarification into Notes"). It SHALL never delete a pair except through `resolve` and never change an existing answer, and the stored text SHALL be in the format of the Clarifications column. Everything else about the writer is unchanged: validation as the merged story, all-or-nothing, and refusal of benched stories.

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

## ADDED Requirements

### Requirement: Resolve a clarification into Notes
When the user states the answer to a question while a story is being shaped, `propose-stories` SHALL record it as a decision in Notes and remove the question, instead of leaving the pair or adding a second copy to Notes. It SHALL do so with `resolve` for a proposed story and with a `Clarifications` review row of action `resolve` for a backlog story, and SHALL show the note text and the removed question to the user before the yes/no. The note SHALL be composed as a decision; it MAY leave out the question's wording when the answer makes the question implicit. The note SHALL be non-empty and MAY have several lines. A pair MAY be resolved whether its stored answer is filled or empty. A skill SHALL NOT remove a pair without a note. The rule SHALL be written once in `ai/guidelines/product-backlog.md` and cited by the skills.

#### Scenario: Answer stated while shaping
- **WHEN** the user says approvals are owned by Finance and the story has the open question "Who owns approvals?"
- **THEN** the proposal shows Notes gaining the line "Approvals are owned by Finance" and the question removed, and writes both in one step after the yes/no

#### Scenario: Question left out of the note
- **WHEN** the answer is comprehensive without the question
- **THEN** the note holds the decision alone, not a Q and A

#### Scenario: Still-open question with the answer in the session
- **WHEN** the stored pair has an empty answer but the user stated the answer in the session
- **THEN** it can be resolved without first recording the answer on the pair

#### Scenario: No bare delete
- **WHEN** the skill would remove a question without recording anything in Notes
- **THEN** the writer rejects it for lack of a note
