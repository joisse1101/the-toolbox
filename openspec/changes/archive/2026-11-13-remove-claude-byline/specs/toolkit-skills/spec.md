## MODIFIED Requirements

### Requirement: PR content follows the template
Each PR SHALL have a conventional-commit title (`type(scope): subject`) that is the commit subject
for a single-commit group and a new title otherwise. The body SHALL follow the template: a summary
that explains why, the type of change ticked from the commit types (breaking when a commit is
marked `!` or `BREAKING CHANGE`), the commit titles under changes made, and a testing section. The
testing section SHALL hold the automated and manual checkboxes, an Author Verification subsection and
a How to Test This PR subsection. The Related Issues section SHALL be omitted when there are no
related issues. The body SHALL have no visual-proof section and SHALL NOT end with an attribution line.

A group SHALL need no tests when its commit type is `chore`, `build`, `ci`, `docs` or `revert` and the
group's diff changes no behavior. The command SHALL judge that from the diff and SHALL NOT use a list of
repository paths. Executable code, tests, migrations and files that instruct an agent or tool (prompts,
skills, commands, hooks, workflows) SHALL count as behavior; a file extension SHALL be only a hint. When
the judgment is uncertain the group SHALL be treated as needing tests. For a group that needs no tests the body SHALL omit the whole
testing section (How Has This Been Tested?, Author Verification and How to Test This PR) and the summary
SHALL be one sentence that leads with why. The presentation SHALL state, for each group, whether it needs
tests and why, so the author can change it.

#### Scenario: Testing section
- **WHEN** a group adds or changes test files
- **THEN** the body SHALL list those tests and tick the automated-tests box

#### Scenario: Manual test results from OpenSpec
- **WHEN** the branch has an OpenSpec change whose `tasks.md` records verification tasks with observed results, and at least one is a manual check, meaning a command run or behavior observed by hand
- **THEN** Author Verification SHALL hold one bullet per check with the command or input and the recorded result, and the manual-testing box SHALL be ticked

#### Scenario: No recorded manual testing
- **WHEN** Author Verification holds no manual check
- **THEN** the manual-testing box SHALL stay unticked

#### Scenario: No hard-coded counts
- **WHEN** the body reports a test count or similar figure
- **THEN** that figure SHALL come from a recorded result and SHALL NOT be a value fixed in the template

#### Scenario: Chore touching only config or docs
- **WHEN** a `chore` group's diff changes only a manifest and prose documentation
- **THEN** the body SHALL have a one-sentence summary, the type of change and the changes made, and SHALL have no testing section

#### Scenario: Chore that changes behavior
- **WHEN** a `chore` group's diff changes a command or skill file that instructs an agent, even though the file is Markdown
- **THEN** the group SHALL be treated as needing tests and the body SHALL keep the testing section

#### Scenario: Uncertain judgment
- **WHEN** the command cannot tell whether a `chore` group's diff changes behavior
- **THEN** the group SHALL be treated as needing tests

#### Scenario: Author overrides the judgment
- **WHEN** the presentation says a group needs no tests and the author replies that it does
- **THEN** the next presentation SHALL show the testing section for that group

#### Scenario: No attribution line in the body
- **WHEN** the command writes a PR body
- **THEN** the body SHALL end with its last template section or the last change line, with no attribution or generated-by line added
