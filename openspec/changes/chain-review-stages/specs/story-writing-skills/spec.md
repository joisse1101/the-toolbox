## ADDED Requirements

### Requirement: Propose ends with a review round
After the last read-back of a write, `jois-story-propose` SHALL call `jois-story-review` in findings mode on the stories it added or patched in that turn, and its `allowed-tools` SHALL include `Skill`. For each finding with confidence `ready` that concerns a proposed story it just wrote, it SHALL send a patch through `write-proposal.mjs` without asking a second yes/no, then read the file back as "Verify every write" says. A finding with confidence `confirm`, or one that needs a decision from the user, SHALL NOT be patched; propose SHALL add it to the story as a Clarifications question and SHALL list it in the report. It SHALL stop after 2 rounds of review and patch. A finding about a backlog story propose did not write, or about a frozen story, SHALL be reported and SHALL NOT be written. The report SHALL list every automatic fix with the story by Title, the field, the old value and the new value, so the user sees what changed after the confirmed write.

#### Scenario: A certain finding is patched
- **WHEN** review returns a `ready` finding that a written story's "so that" repeats its action
- **THEN** propose patches the story, reads it back and lists the old and the new wording in its report, without a further question

#### Scenario: A decision becomes a question
- **WHEN** review returns a `confirm` finding that a vague criterion needs a threshold
- **THEN** propose adds a Clarifications question to the story, does not change the criterion, and lists the question in its report

#### Scenario: Stops after two rounds
- **WHEN** the second review round still returns `ready` findings
- **THEN** propose patches nothing more and lists the remaining findings in its report

#### Scenario: Review skill not installed
- **WHEN** `jois-story-review` is not installed
- **THEN** propose says the review round was not run and why, and does not count it as passed
