## ADDED Requirements

### Requirement: Plan asks whether to commit the plan files
After a slice is written, read back, verified and its stories frozen, `jois-story-plan` SHALL ask once with AskUserQuestion whether to commit the slice's plan files (`UC-<slice>.md`, `tasks.md` and `source.json`), with the options "Yes, commit" and "Not now". It SHALL commit them only on "Yes, commit", staged by explicit path, with the message `docs(plans): plan <backlog>/<slice>`, and SHALL NOT push. It SHALL NOT stage any other file, and SHALL NOT commit when git ignores the files.

#### Scenario: User commits
- **WHEN** the user picks "Yes, commit"
- **THEN** plan stages the three files by path, commits them with `docs(plans): plan <backlog>/<slice>`, and names no other file

#### Scenario: User declines
- **WHEN** the user picks "Not now"
- **THEN** plan commits nothing and says the files stay untracked until the user commits them

#### Scenario: Files ignored by git
- **WHEN** `git check-ignore` reports the slice's `tasks.md` as ignored
- **THEN** plan does not ask, says the files are ignored by the project's `.gitignore`, and commits nothing

#### Scenario: No git repository
- **WHEN** the current folder is not inside a git repository
- **THEN** plan does not ask and commits nothing
