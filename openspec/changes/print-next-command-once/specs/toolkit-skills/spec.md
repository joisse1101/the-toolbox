## MODIFIED Requirements

### Requirement: Apply orchestrator command takes a slice
The toolkit SHALL include a command `jois-code:apply`, the single file `toolkit/commands/jois-code/apply.md`, that applies a slice written by `jois-story-plan` by handing its tasks to `task-applier` one group at a time. It SHALL accept the slice as `slice <backlog>/<slice>`, `<backlog>/<slice>`, `<backlog> <slice>` with or without the word `slice`, a slice name alone, a backlog name alone, or no argument. When the argument does not name exactly one slice it SHALL ask the user and SHALL NOT dispatch anything until the user answers. An OpenSpec change is applied with `/opsx:apply`, not with this command.

#### Scenario: Slice named
- **WHEN** the user types `/jois-code:apply slice accounts/sign-in`
- **THEN** the command SHALL announce the slice `sign-in` of the backlog `accounts` and work on that slice only

#### Scenario: Backlog and slice without the prefix
- **WHEN** the user types `/jois-code:apply accounts/sign-in`, `/jois-code:apply accounts sign-in` or `/jois-code:apply slice accounts sign-in`
- **THEN** the command SHALL announce the slice `sign-in` of the backlog `accounts` and work on that slice only

#### Scenario: Slice name found in one backlog
- **WHEN** the user types `/jois-code:apply sign-in` and only the backlog `accounts` has a slice of that name
- **THEN** the command SHALL say it picked the slice `sign-in` of the backlog `accounts` and work on it

#### Scenario: Slice name found in several backlogs
- **WHEN** the user types `/jois-code:apply sign-in` and two backlogs have a slice of that name
- **THEN** the command SHALL ask which backlog with AskUserQuestion and SHALL NOT dispatch anything until the user answers

#### Scenario: Any other argument
- **WHEN** the user types `/jois-code:apply accounts`, `/jois-code:apply slice` or `/jois-code:apply` with no argument
- **THEN** the command SHALL ask which slice with AskUserQuestion, listing the slices with at least one unticked task, let the user type any other slice, and SHALL NOT dispatch anything until the user answers

#### Scenario: Name that matches nothing
- **WHEN** the user types a name that is neither a backlog nor a slice
- **THEN** the command SHALL say nothing matched, ask which slice as when no argument was given, and SHALL NOT dispatch anything

#### Scenario: Copy of the slice in another worktree
- **WHEN** the user types `/jois-code:apply sign-in` and the slice exists in the project and in a worktree under `.trees/`
- **THEN** the command SHALL use the project's own slice and SHALL NOT ask about the copy

#### Scenario: Data folder outside the project
- **WHEN** the user types `/jois-code:apply accounts` and the data folder that `planner.config.yaml` names is outside the project
- **THEN** the command SHALL still list the slices of `accounts` with an unticked task, read through the plan skill's slice reader, and ask which one

#### Scenario: Full form printed at the end
- **WHEN** the command finishes with no task left unticked
- **THEN** the last line of its final reply SHALL be the command of the next stage with the real names, `/jois-code:archive slice <backlog>/<slice>` or, when the slice's `validation.md` does not say `Validated: yes` at the current commit, `/jois-code:validate slice <backlog>/<slice>`, and the command SHALL NOT print its own command

#### Scenario: No command line during the run or at an early stop
- **WHEN** the command finishes a group, asks a question, waits for an agent, or stops before the slice is built
- **THEN** the command SHALL NOT print any slash command line, and a reply after the run has ended SHALL NOT print one either

#### Scenario: Slice has no tasks
- **WHEN** the slice's `tasks.md` has no task line
- **THEN** the command SHALL say the slice has no tasks, point to `jois-story-plan` and stop, and SHALL NOT say the slice is built
