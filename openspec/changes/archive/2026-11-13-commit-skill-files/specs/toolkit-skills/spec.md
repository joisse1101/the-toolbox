## ADDED Requirements

### Requirement: Apply treats review.md as a working file
The `jois-code:apply` command SHALL say in its command file that `review.md` is a working file that `/jois-code:archive` copies into `ARCHIVED.md` and then removes. It SHALL NOT read a `review.md` back except to replace it. Apply SHALL NOT stage `review.md`.

#### Scenario: Review recorded
- **WHEN** apply writes `review.md` at the end of its review step
- **THEN** the file is written into the slice folder and is not staged

### Requirement: Apply commits a tracked tasks.md with each group
When git tracks the slice's `tasks.md`, the `jois-code:apply` command SHALL stage `tasks.md` by explicit path with each group's commit, so the ticked boxes travel with the code they describe. When `tasks.md` is not tracked, apply SHALL NOT stage it.

#### Scenario: Tracked task list
- **WHEN** `git ls-files` lists the slice's `tasks.md` and a group finishes
- **THEN** the group's commit holds the group's files and the ticked `tasks.md`

#### Scenario: Untracked task list
- **WHEN** `git ls-files` does not list the slice's `tasks.md`
- **THEN** the group's commit holds only the group's files

### Requirement: PR commands read the archive record
When `/jois-git:write-pr` or `/jois-git:update-pr` finds a slice of the branch whose folder holds `ARCHIVED.md` and no `validation.md` or `review.md`, it SHALL take the validation and review evidence from the summary in `ARCHIVED.md`, follow its link to the wiki for known, not fixed lines when the lines were moved there, and SHALL tag the source `ARCHIVED.md`. A current `validation.md` or `review.md` SHALL still come first.

#### Scenario: Slice reduced before the PR
- **WHEN** the branch's slice was archived and reduced, and the user runs `/jois-git:write-pr`
- **THEN** the test section shows the claim counts and tested commit from `ARCHIVED.md`, with `ARCHIVED.md` as the source

#### Scenario: Result files still present
- **WHEN** the slice folder holds a current `validation.md` and an `ARCHIVED.md`
- **THEN** the PR command reads `validation.md` as before
