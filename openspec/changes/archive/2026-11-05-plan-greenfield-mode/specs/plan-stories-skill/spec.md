## ADDED Requirements

### Requirement: Mode question
When the current folder holds little or no code for the flow, the skill SHALL ask the user once, at the scope step, whether the story builds the code or describes code that exists, and SHALL choose describe-only, greenfield or repo mode from the answer. It SHALL NOT assume the mode. When a writer rejects a check, the skill SHALL read the section of the conventions the error names before it proposes a way forward, and SHALL NOT present a limit of the tool as a limit of the task.

#### Scenario: Empty folder
- **WHEN** the current folder holds no code for the flow and the user has not said what the story is for
- **THEN** the skill asks whether the story builds the code or describes existing code before the design checkpoint

#### Scenario: Story builds the code
- **WHEN** the user answers that the story builds the code from scratch
- **THEN** the skill drafts a greenfield slice, asks the project layout and stack at the design checkpoint, and records the answer as a `user-confirmed` decision

#### Scenario: Writer rejects a build plan
- **WHEN** the writer rejects a build plan with a message about greenfield mode
- **THEN** the skill reads the named section of the conventions and redrafts in that mode instead of dropping the build plan

## MODIFIED Requirements

### Requirement: Design level without a repo
When the current folder holds no code to read for the flow and the story describes a design rather than building the code, the skill SHALL still draw design-level diagrams: the boundary, service, domain, repository, port and infrastructure participants, the entry contract, the failure responses and the security behaviour that the stories, the lexicon and the user's answers establish. It SHALL NOT invent infrastructure, libraries, routes or file paths, SHALL mark Maturity as planned and the code-bound sections (Implementation overview, Traceability) as `TBC`, and SHALL ask the user for every design decision the stories do not state instead of leaving the diagram conceptual. A story that builds the code from scratch is drawn in greenfield mode instead.

#### Scenario: Technology not in the stories
- **WHEN** a flow would need a store, a token mechanism or an external service the stories do not name
- **THEN** the skill asks which, records the answer as a design decision, and draws only what the user confirmed

#### Scenario: Nothing to draw without an answer
- **WHEN** the user declines to decide a point the flow depends on
- **THEN** that step is drawn `TBC` and listed as an open question, and no technology is invented
