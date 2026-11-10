# code-validation Specification

## Purpose

Tests whether code does what its plan or its PR says, and reports each requirement as met, not met or could not test, with evidence, so that a reviewer and the archive step can rely on the result.

## Requirements

### Requirement: Validate takes its intent from a slice or a PR
The command `/jois-code:validate` SHALL accept `slice <backlog>/<slice>` or a PR number, and SHALL NOT guess between them. A bare argument that is neither SHALL be refused with a request for one of the two forms.

#### Scenario: Slice form
- **WHEN** the user runs `/jois-code:validate slice iam/login`
- **THEN** the claims come from the tasks and the stories of that slice

#### Scenario: PR form
- **WHEN** the user runs `/jois-code:validate 123`
- **THEN** the claims come from the description of PR 123 and the issue it links

#### Scenario: Unclear argument
- **WHEN** the user runs `/jois-code:validate login`
- **THEN** the command asks for `slice <backlog>/<slice>` or a PR number and tests nothing

### Requirement: Claims of a slice
For a slice, validate SHALL build one claim per `Satisfies:` row of a task and per acceptance criterion of a story in the slice's scope, and each claim SHALL name its source. It SHALL stop and test nothing when the plan skill's stale check reports the slice as stale, missing or ambiguous.

#### Scenario: Claim from a task
- **WHEN** a task satisfies `AC-login-lockout`
- **THEN** validate lists a claim for that row, with the task as its source

#### Scenario: Stale slice
- **WHEN** the stale check reports that a story of the slice changed
- **THEN** validate names the story, points to `jois-story-plan` and tests nothing

### Requirement: Claims of a PR
For a PR, validate SHALL build its claims from the PR description and the linked issue, and SHALL work when no slice exists. When the PR links no issue, it SHALL say so and use the description alone.

#### Scenario: PR with no slice
- **WHEN** the PR is from someone else and has no slice
- **THEN** validate still lists claims and tests them

#### Scenario: PR with no linked issue
- **WHEN** the PR links no issue
- **THEN** validate says so and builds the claims from the description

### Requirement: Check one story of a slice
In the slice form the user MAY name one story ID, and validate SHALL then test only the claims that come from that story.

#### Scenario: Single story
- **WHEN** the user runs `/jois-code:validate slice iam/login <story ID>`
- **THEN** only the claims of that story are tested, and the report says the run is partial

#### Scenario: Unknown story
- **WHEN** the story ID is not in the slice's scope
- **THEN** validate names the ID, lists the stories of the slice and tests nothing

### Requirement: Verdict and evidence for every claim
Validate SHALL give each claim exactly one verdict: `met`, `not met` or `could not test`. Each verdict SHALL carry its evidence: the command and its exit code, or what the browser showed. A claim SHALL NOT be `met` without evidence, and a claim it did not test SHALL be `could not test` with the reason.

#### Scenario: Backend claim
- **WHEN** a claim is covered by a test suite
- **THEN** the verdict gives the command, its exit code and the counts line

#### Scenario: Nothing to test with
- **WHEN** no check can reach a claim
- **THEN** the verdict is `could not test` and names why

### Requirement: Testing method follows the kind of change
Validate SHALL test a user-interface claim by driving the interface with `playwright-cli`, a backend claim by running the project's own tests, and an end-to-end claim by running the flow. It SHALL take test commands only from the project's own instructions, except that in the PR form a test file the PR adds or changes counts as one when it fits the runner form those instructions document. The report SHALL mark evidence from such a file as coming from the PR.

#### Scenario: UI claim
- **WHEN** a claim says a button disables after one click
- **THEN** validate drives the page and reports what it saw

### Requirement: Result file of a slice run
After a slice run, validate SHALL write a result file into the slice folder. It SHALL record each claim, its verdict and evidence, and whether the run was full or partial. A PR run SHALL write no file and print its report only.

#### Scenario: Full run
- **WHEN** a slice run tests every claim
- **THEN** the file says the run was full and lists every verdict

#### Scenario: Partial run
- **WHEN** a run names one story
- **THEN** the file says partial and lists only the claims tested

#### Scenario: PR run
- **WHEN** the target is a PR number
- **THEN** no file is written

### Requirement: What counts as validated
A slice SHALL count as validated only when its latest full run has every claim `met`. A partial run SHALL NOT make a slice validated, and a run with any `not met` or `could not test` claim SHALL NOT either.

#### Scenario: One claim could not be tested
- **WHEN** a full run ends with one `could not test`
- **THEN** the slice is not validated

#### Scenario: Partial run only
- **WHEN** only partial runs exist
- **THEN** the slice is not validated

### Requirement: Code runs in a throwaway checkout
Validate SHALL run the code under test in a throwaway checkout under `.scratch/` and SHALL remove it at the end. It SHALL install only inside that checkout, SHALL use mock data, and SHALL stop before touching any real system, real credential or real user data.

#### Scenario: Install
- **WHEN** the code under test needs dependencies
- **THEN** they are installed inside the checkout and nowhere else

#### Scenario: Real system
- **WHEN** a claim can be tested only against a real external system
- **THEN** that claim is `could not test` and the system is not touched

### Requirement: Someone else's PR needs confirmation
Before it runs a PR whose author is not the current user, validate SHALL say that it will run code the user has not read and that a checkout is not a sandbox, and SHALL wait for the user's explicit yes. Until the yes it SHALL run only the read-only lookups of the PR and its issue, and no fetch, checkout, install or test.

#### Scenario: Foreign PR
- **WHEN** the PR author is another person
- **THEN** validate asks and runs nothing until the user says yes

### Requirement: Validate changes nothing outside its checkout
Validate SHALL NOT edit the code under test, SHALL NOT commit or push, and SHALL NOT write to GitHub. Its only write outside the throwaway checkout SHALL be the result file of a slice run.

#### Scenario: A failing claim
- **WHEN** a claim is `not met`
- **THEN** validate reports it and leaves the code as it was

### Requirement: Validate can be started by the review command
`/jois-code:validate` SHALL be startable by `/jois-code:review`, and SHALL apply every rule it has when started that way. The review command SHALL NOT answer a question that validate puts to the user, including the confirmation before it runs a PR that is not the user's own.

#### Scenario: Someone else's PR through review
- **WHEN** the review command starts validate for a PR whose author is not the user
- **THEN** validate asks the user for a yes, with the statement that a checkout is not a sandbox, and runs nothing before it

#### Scenario: Same result as a direct run
- **WHEN** the review command starts validate for a slice or a PR
- **THEN** validate writes the same result file, or no file, as a direct run of the same form
