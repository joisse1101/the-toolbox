## MODIFIED Requirements

### Requirement: PR content follows the template
Each PR SHALL have a conventional-commit title (`type(scope): subject`) that is the commit subject
for a single-commit group and a new title otherwise. The body SHALL follow the template: a summary
that explains why, the type of change ticked from the commit types (breaking when a commit is
marked `!` or `BREAKING CHANGE`), the commit titles under changes made, and a testing section. The
testing section SHALL hold the automated and manual checkboxes, an Author Verification subsection and
a How to Test This PR subsection. The Related Issues section SHALL be omitted when there are no
related issues. The body SHALL have no visual-proof section and SHALL end with the attribution line the
environment requires.

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

### Requirement: Author verification is recorded, not invented
The skill SHALL draft Author Verification from the matching OpenSpec `tasks.md` and from the
conversation it runs in. It SHALL NOT state an observed result that no source records. A source is a
`tasks.md` result, a test, build or lint command whose output is visible in the conversation, or the
user's answer. A checked verification task with no recorded result SHALL yield a bullet that names the
check without a result, and the skill SHALL flag it. A task that is not verification SHALL NOT yield a
bullet.

A command run in the conversation SHALL yield a bullet for a group only when it covers a directory the
group's diff changes. It SHALL state only the outcome and counts the output shows. It SHALL NOT be
used as the group's result when a later edit in the conversation touched a file in the group's diff, or
when the run failed; the skill SHALL name such a run to the user instead. A conversation that holds no
usable run, because the session is new or its history is summarized, SHALL contribute nothing.

When no source records verification for a group (no OpenSpec change, no verification task in
`tasks.md`, a task with no recorded result, and no usable run), the skill SHALL first offer to run the
group's documented tests as the next requirement says, and for any group still without a source SHALL
ask the user once, covering every such group, what they ran and saw, before presenting any PR. It SHALL turn the user's
answer into bullets and SHALL NOT add results the user did not give. When the user has none, it SHALL
write that none were recorded.

A group that needs no tests SHALL NOT be offered a run, SHALL NOT be asked what the user ran and saw,
and SHALL NOT have an Author Verification subsection. Groups that need tests are asked as before, once
for all of them.

#### Scenario: Result recorded
- **WHEN** a verification task in `tasks.md` records an observed result
- **THEN** its bullet SHALL carry that result

#### Scenario: Checked task without a result
- **WHEN** a verification task is checked and records no result
- **THEN** its bullet SHALL name the check, SHALL NOT state an outcome, and SHALL be flagged

#### Scenario: Test run seen in the conversation
- **WHEN** the conversation shows `npm test` run in `web/` with its output and the group's diff changes files under `web/`
- **THEN** Author Verification SHALL hold a bullet with that command and the outcome and counts the output shows

#### Scenario: Run covers another directory
- **WHEN** the conversation shows tests run only in `api/` and the group's diff changes only files under `web/`
- **THEN** that run SHALL NOT yield a bullet for the group

#### Scenario: Edited after the run
- **WHEN** a file in the group's diff was edited in the conversation after the test run
- **THEN** the run SHALL NOT be used as the group's result and the skill SHALL tell the user it is out of date

#### Scenario: Failed run
- **WHEN** the latest run of a command in the conversation failed
- **THEN** the skill SHALL NOT report it as a pass and SHALL tell the user it failed

#### Scenario: Fresh or summarized conversation
- **WHEN** the command is run in a new session or the earlier history is summarized
- **THEN** the conversation SHALL contribute no bullet and the skill SHALL use `tasks.md` and the user as before

#### Scenario: Gaps across several groups
- **WHEN** two groups each lack recorded verification from every source
- **THEN** the skill SHALL ask the user once for both and SHALL NOT ask per group

#### Scenario: No OpenSpec change
- **WHEN** the group's commits touch no OpenSpec change and the conversation holds no usable run
- **THEN** the skill SHALL ask the user what verification they ran

#### Scenario: Nothing to report
- **WHEN** the user says they ran no verification
- **THEN** Author Verification SHALL state that none was recorded and the manual box SHALL stay unticked

#### Scenario: Group needs no tests
- **WHEN** a group needs no tests and has no recorded verification
- **THEN** the skill SHALL NOT ask the user about it and SHALL NOT write an Author Verification subsection for it

#### Scenario: Mixed groups
- **WHEN** one group needs no tests and another needs tests and has no recorded verification
- **THEN** the skill SHALL ask the user once, about the second group only

### Requirement: Reviewer steps are grounded and sourced
The skill SHALL suggest How to Test This PR steps from the group's commits and diff, its `tasks.md`,
the commands run in the conversation and the repository's own documents. Each step SHALL be a checkout
step, a run step or a read step. The steps SHALL target the behavior the group changes: for a fix, how
to confirm the fix; for a feature, how to exercise it; the repository's general test command MAY follow
but SHALL NOT be the only step when the group's own tests or checks can be named. A run step SHALL use a
command that a document states and that the diff points to, or a command that the conversation shows was
run, and every path in it SHALL exist in the checkout; a step failing that check SHALL be dropped. The
skill SHALL NOT invent a command or flag that neither a document nor the conversation shows. The skill
SHALL show each step and each verification bullet with its source when it presents the PR (`tasks.md`
with or without a recorded result, `chat`, `repo docs`, `inferred from diff` or `user`), and SHALL NOT
include those source tags in the PR body. A group that needs no tests SHALL have no steps.

#### Scenario: Documented command the diff points to
- **WHEN** the diff changes files under a directory whose documented test command is known
- **THEN** a run step SHALL use that command

#### Scenario: Path missing from the checkout
- **WHEN** a candidate run step names a script or path that does not exist
- **THEN** the skill SHALL drop that step

#### Scenario: Undocumented command
- **WHEN** the diff adds a script and no document says how to run it
- **THEN** the skill SHALL NOT suggest a run step for it and MAY suggest a read step

#### Scenario: Sources shown only to the author
- **WHEN** the skill presents a PR for confirmation
- **THEN** each bullet and step SHALL show its source, including `chat` for a conversation run, and the PR body that is opened SHALL carry none

#### Scenario: Fix targets the fix
- **WHEN** a `fix` group adds a test that covers the fixed behavior
- **THEN** the steps SHALL name that test and the behavior it confirms, and SHALL NOT be only the repository's full test command

#### Scenario: Command from the conversation
- **WHEN** the conversation shows the author reproducing the bug with a command and confirming the fix with it
- **THEN** a run step MAY use that command with source `chat`, even if no document states it

#### Scenario: Summarized conversation
- **WHEN** the earlier history is summarized
- **THEN** the conversation SHALL contribute no step

#### Scenario: Group needs no tests
- **WHEN** a group needs no tests
- **THEN** the body SHALL have no How to Test This PR subsection
