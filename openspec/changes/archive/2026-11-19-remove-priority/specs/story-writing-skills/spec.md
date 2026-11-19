## MODIFIED Requirements

### Requirement: Story content follows the guidelines
Stories drafted by either skill SHALL meet `references/product-backlog.md` of the skill: the "As a …, I want …, so that …" format, a Title that names one story, at most 13 sprint points, acceptance criteria in Given-When-Then form that cover the failure path, and an Epic and Feature chosen to fit the existing backlog (reusing an existing Epic or Feature name where one fits). A story that would exceed the size limit SHALL be split into several.

#### Scenario: Too big
- **WHEN** the agreed story would be sized above 13 points
- **THEN** the skill proposes splitting it before showing drafts for confirmation

#### Scenario: Existing Epic reused
- **WHEN** the backlog already has the Epic "Identity & Access Management" and the new story belongs there
- **THEN** the draft uses that Epic name exactly
