## MODIFIED Requirements

### Requirement: Archive takes one slice
The command `/jois-code:archive` SHALL work on one slice. It SHALL accept the slice as `slice <backlog>/<slice>`, `<backlog>/<slice>`, `<backlog> <slice>` with or without the word `slice`, a slice name alone, a backlog name alone, or no argument. It SHALL NOT guess between two matches: when the argument does not name exactly one slice, it SHALL ask the user, and it SHALL read nothing but the slice list and write nothing until the user answers.

#### Scenario: Slice form
- **WHEN** the user runs `/jois-code:archive slice iam/password-reset`
- **THEN** archive works on the slice `password-reset` of the backlog `iam`

#### Scenario: Backlog and slice without the prefix
- **WHEN** the user runs `/jois-code:archive iam/password-reset` or `/jois-code:archive iam password-reset`
- **THEN** archive works on the slice `password-reset` of the backlog `iam`, as with the slice form

#### Scenario: Slice name found in one backlog
- **WHEN** the user runs `/jois-code:archive password-reset` and only the backlog `iam` has a slice of that name
- **THEN** archive says it picked the slice `password-reset` of the backlog `iam` and works on it

#### Scenario: Slice name found in several backlogs
- **WHEN** the user runs `/jois-code:archive login` and the backlogs `iam` and `admin` both have a slice `login`
- **THEN** archive asks which backlog with AskUserQuestion and writes nothing until the user answers

#### Scenario: Backlog name alone, `slice` alone or no argument
- **WHEN** the user runs `/jois-code:archive iam`, `/jois-code:archive slice`, or `/jois-code:archive` with no argument
- **THEN** archive asks which slice with AskUserQuestion, listing the slices that have every task ticked and no `ARCHIVED.md`, and lets the user type any other slice

#### Scenario: Unclear argument
- **WHEN** the user runs `/jois-code:archive pasword-reset` and no backlog or slice has that name
- **THEN** archive says nothing matched, asks which slice as when no argument was given, and writes nothing

#### Scenario: Copy of the slice in another worktree
- **WHEN** the user runs `/jois-code:archive password-reset` and the slice exists in the project and in a worktree under `.trees/`
- **THEN** archive uses the project's own slice and does not ask about the copy

#### Scenario: Data folder outside the project
- **WHEN** the user runs `/jois-code:archive iam` and the data folder that `planner.config.yaml` names is outside the project
- **THEN** archive still lists the slices of `iam`, read through the plan skill's slice reader, and asks which one

#### Scenario: Full form printed at the end
- **WHEN** archive finishes, stops at the confirmation word, refuses the slice or stops early, at any point after the slice was settled
- **THEN** archive prints no slash command line, neither its own nor another stage's, and a reply after the run has ended prints none either
