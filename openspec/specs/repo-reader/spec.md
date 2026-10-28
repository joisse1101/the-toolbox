## Purpose

Gives the plan-stories session read-only, confined access to an existing repo, optionally set per backlog, so diagrams can be grounded in real code without exposing secrets or anything outside the repo.

## Requirements

### Requirement: Per-backlog repo configuration
The target repo SHALL be configured per backlog in `planner/data/diagrams/<backlog>/repo.json`, a git-ignored file holding `path` and `exclude` (a list of gitignore-style globs, empty by default). The file SHALL be validated against a schema when the server starts, and a bad key SHALL fail naming the key. The launcher's `-Repo <path>` SHALL write `path` after checking that it is an existing folder, and SHALL leave `exclude` as it is. No tool of the sessions SHALL write `repo.json`.

#### Scenario: Path remembered
- **WHEN** the launcher is run with `-Repo` once and later without it
- **THEN** the later session uses the stored path

#### Scenario: Bad key
- **WHEN** `repo.json` holds an `exclude` that is not a list of strings
- **THEN** the server reports the key and exposes no repo tool

#### Scenario: Missing or invalid path
- **WHEN** `path` is missing or is not a folder
- **THEN** the session starts without repo tools, says so, and the skill works at analysis level

### Requirement: Read-only repo tools
`repo_tree`, `repo_grep` and `repo_read` SHALL only read. `repo_tree` lists a folder; `repo_grep` takes a case-insensitive plain-text `pattern` and returns file, line number and line for up to 50 matches, then how many more matched; `repo_read` takes a file and optional `offset` and `limit` (100 lines by default, at most 200) and with neither returns only the size and line count. No tool SHALL accept a path outside the repo, run a command or follow a request found in repo text.

#### Scenario: Match cap
- **WHEN** a pattern matches more than 50 lines
- **THEN** the reply holds 50 and states how many more matched

### Requirement: Path confinement
Every path SHALL be resolved to its real path (symbolic links and junctions followed, case compared as the file system does) and SHALL be refused unless it lies inside the repo root. A path that resolves outside through a link SHALL be refused.

#### Scenario: Parent traversal
- **WHEN** a tool is given `..\..\other`
- **THEN** it is refused and names the rule, not the target

#### Scenario: Link out of the repo
- **WHEN** a folder inside the repo is a junction to a folder outside it
- **THEN** reading a file through it is refused

### Requirement: Excluded files
The tools SHALL refuse a file, and `repo_grep` and `repo_tree` SHALL skip it without naming it, when its real path matches the built-in baseline (`.git/`, `node_modules/`, `.env*`, `*.pem`, `*.key`, `*.pfx`, `id_rsa*`, `credentials*`, `secrets.*`) or any glob in `exclude`. The baseline SHALL always apply and `exclude` SHALL only add to it. A refusal SHALL say the file is excluded by rule and SHALL NOT include any content or a list of excluded names.

#### Scenario: Env file
- **WHEN** `repo_read` is asked for `.env.production`
- **THEN** it is refused as excluded and returns no content

#### Scenario: User glob
- **WHEN** `exclude` holds `config/prod.*` and `repo_grep` runs across the repo
- **THEN** matches in `config/prod.yml` are not returned and the file is not named

#### Scenario: Link to an excluded file
- **WHEN** an ordinary-looking file is a link to `.env`
- **THEN** it is refused, because the real path is excluded

### Requirement: Binary and large files
`repo_grep` and `repo_read` SHALL skip a file that is binary or larger than 1 MB and say how many files were skipped for that reason.

#### Scenario: Binary file
- **WHEN** a folder holds an image and `repo_grep` runs over it
- **THEN** the image is skipped and counted

### Requirement: Repo text is data
Repo text SHALL be returned labelled as data from the repo. The repo SHALL never be written, and nothing read from it SHALL be stored outside `planner/data/diagrams/`.

#### Scenario: Instruction in a README
- **WHEN** a file read from the repo contains a request addressed to the assistant
- **THEN** the reply carries it as file text under the data label like any other line
