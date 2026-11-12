# story-to-code-sample Specification

## Purpose

Gives the toolkit one committed sample project for the story-to-code flow, with a script that rebuilds it as a mock repo and a saved result for every stage, so the flow can be explained and an edited skill tested without paying for a full model run each time.

## Requirements

### Requirement: Sample folder layout
The toolkit SHALL keep the sample under `toolkit/sample/story-to-code/`, holding `README.md`, `build-mock-repo.ps1`, the baseline app in `app/`, the mock repo's wiki in `wiki/`, its `CLAUDE.md`, and the saved results in `stages/`. Nothing in it SHALL import a file outside `toolkit/`, and the installer SHALL NOT copy it to a machine or a project.

#### Scenario: Installer ignores the sample
- **WHEN** the installer runs a full install
- **THEN** no file under `toolkit/sample/` is copied to the target

### Requirement: Baseline app
The sample app SHALL be a habit and focus tracker built with Vite, TypeScript and Tailwind CSS that keeps its data in browser local storage. The baseline SHALL provide a habit list with a daily check-off, a Pomodoro timer and a task category picker (coding, writing, reading). It SHALL carry its own `package-lock.json`, one passing test and a test command named in the mock repo's `CLAUDE.md`.

#### Scenario: Baseline test passes
- **WHEN** the baseline app's test command runs in a built mock repo
- **THEN** it passes

### Requirement: Unbuilt features are a roadmap
The app SHALL stay incomplete. The sample wiki SHALL hold a Future releases page that lists the features not yet built: category audio scapes, streaks, weekly stats, custom timer lengths and export and import. Each item SHALL be an idea a person can explore, not a story. A feature the recorded walk builds SHALL move to a Released section once archived.

#### Scenario: A rerun always has work
- **WHEN** a person restores the mock repo to the archived stage
- **THEN** the Future releases page still lists at least one feature that no archived slice has built

### Requirement: Generated audio
Any ambient sound the app plays SHALL be generated in code, with no bundled audio recordings. The sample SHALL also read audio files from an optional `audio/` folder that git ignores, and the app SHALL use such a file in place of the generated sound when one is present. The baseline plays no sound, so this binds the audio feature when a rerun builds it.

#### Scenario: No audio files
- **WHEN** the `audio/` folder is missing or empty
- **THEN** any ambient sound the app plays is generated, and the build and the tests still pass

### Requirement: Build script
`build-mock-repo.ps1` SHALL build the mock repo under `.scratch/mock-app/` as its own git repository on a branch other than `main` and `master`, install the toolkit into it with the installer at project scope, and run `npm ci` inside it only. It SHALL NOT write to the user's home folder or to any global toolkit folder, and SHALL call no model.

#### Scenario: Script keeps to the project
- **WHEN** the script builds the mock repo
- **THEN** every file it writes is under `.scratch/mock-app/` and the global `~/.claude` folders are unchanged

#### Scenario: Existing mock repo
- **WHEN** `.scratch/mock-app/` already exists
- **THEN** the script stops and says so, and deletes nothing unless the person passes an explicit reset option

### Requirement: Restore to a stage
The script SHALL accept a stage name and build the mock repo as it stands at that stage: `baseline`, `proposed`, `accepted`, `planned`, `built`, `validated` or `archived`. An unknown stage SHALL stop the script with the list of valid names.

#### Scenario: Start at apply
- **WHEN** the script runs with the stage `planned`
- **THEN** the mock repo holds the baseline code, the accepted backlog and the planned slice, and the slice's first task is not ticked

### Requirement: Saved stage results
`stages/` SHALL hold one folder per stage with what that stage of the flow writes: the proposals, the accepted backlog, the planned slice (`UC-<slice>.md`, `tasks.md`, `source.json`), the built code as a patch against the baseline app with the ticked `tasks.md` and `review.md`, `validation.md`, and the archived wiki pages with `ARCHIVED.md`. The results SHALL come from one real run of the flow and SHALL contain no content from a real backlog or repo.

#### Scenario: Built stage holds a patch
- **WHEN** a person opens the `built` stage
- **THEN** the code appears as a patch that applies cleanly to the baseline app

### Requirement: Staleness check
A test that calls no model SHALL run each saved stage's backlog, slice and diagrams through the toolkit's own format checkers and SHALL fail when a stage no longer passes. It SHALL also fail when a stage's slice names a story that the stage's backlog does not hold.

#### Scenario: Format change breaks a stage
- **WHEN** a checker's rule changes so that a saved slice no longer passes
- **THEN** the test fails and names the stage and the file

### Requirement: Recording is a separate, deliberate step
Recording the stage results SHALL be a documented step that a person starts on purpose. The build script, the staleness check and the test suites SHALL NOT start it.

#### Scenario: Tests cost no tokens
- **WHEN** the full test suites run
- **THEN** no model session starts

### Requirement: The story tests keep their own fixture
`toolkit/tests/story/fixtures/sample/` SHALL NOT exist. The story-skill tests and the planner's backlog-tree helper SHALL read a hand-written mock backlog, slice and context map kept in `toolkit/tests/story/fixtures/habits/`, and SHALL NOT read `toolkit/sample/story-to-code/`. Both folders SHALL be kept with LF line endings, because tests match their text with `\n`.

#### Scenario: Old fixture gone
- **WHEN** the repo is searched for `fixtures/sample`
- **THEN** no code, test, guideline or config file refers to it

#### Scenario: Recording again changes no checker test
- **WHEN** the stages are recorded again and `stages/` changes
- **THEN** no test other than the staleness check fails

#### Scenario: Line endings pinned
- **WHEN** a Windows checkout converts line endings
- **THEN** the files under `toolkit/tests/story/fixtures/` and `toolkit/sample/story-to-code/` still read with LF
