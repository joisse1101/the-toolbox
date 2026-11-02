## MODIFIED Requirements

### Requirement: Per-backlog repo configuration
The target repo SHALL be configured per backlog in `<backlog>/repo.json`, a git-ignored file holding `path` and `exclude` (a list of gitignore-style globs, empty by default). The file SHALL be validated against a schema when the server starts, and a bad key SHALL fail naming the key. The launcher's `-Repo <path>` SHALL write `path` after checking that it is an existing folder, and SHALL leave `exclude` as it is. No tool of the sessions SHALL write `repo.json`.

#### Scenario: Path remembered
- **WHEN** the launcher is run with `-Repo` once and later without it
- **THEN** the later session uses the stored path

#### Scenario: Bad key
- **WHEN** `repo.json` holds an `exclude` that is not a list of strings
- **THEN** the server reports the key and exposes no repo tool

#### Scenario: Missing or invalid path
- **WHEN** `path` is missing or is not a folder
- **THEN** the session starts without repo tools, says so, and the skill works at analysis level
