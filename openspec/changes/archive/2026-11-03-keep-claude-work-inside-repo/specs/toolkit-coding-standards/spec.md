## ADDED Requirements

### Requirement: Stay-in-repo rule loads in every session
The toolkit SHALL provide a `jois-env-stay-in-repo` rule at `toolkit/rules/jois-env-stay-in-repo.md` with `metadata.version` and `metadata.last_updated` frontmatter and no `paths:` frontmatter, so it loads in every session. It is exempt from the requirement that core rules be code-scoped. The rule SHALL require that every file Claude creates for its own work, such as mock repos, mock data, scratch files and agent progress notes, lives under a single `.scratch/` folder at the project root, that `.scratch/` is git-ignored, and that Claude removes what it created there when the work is done. It SHALL forbid creating such files in the system temp folder, the user's home folder or any folder outside the project, and SHALL state that it takes precedence over a default scratchpad location suggested by the harness. It SHALL forbid Claude from reading or writing outside the project, and from reading subagent transcripts. It SHALL require that, when Claude dispatches a subagent that can write files, Claude tells it to append a short line to `.scratch/agents/<agent>.log` after each step, and that Claude follows the agent through that file or its final report only. It SHALL tell Claude to point tools whose default temp folder lies outside the project (such as `pytest --basetemp` or a `TMPDIR` variable) at `.scratch/`. Each git worktree SHALL use its own `.scratch/`.

#### Scenario: Mock repo needed
- **WHEN** Claude needs a mock repo to verify a change
- **THEN** it SHALL create it under `.scratch/` in the project, and SHALL NOT create it in the system temp folder or elsewhere outside the project

#### Scenario: Harness suggests a temp scratchpad
- **WHEN** the harness names a scratchpad folder outside the project
- **THEN** the rule SHALL take precedence and Claude SHALL use `.scratch/` instead

#### Scenario: Subagent dispatched
- **WHEN** Claude dispatches a subagent that can write files
- **THEN** it SHALL tell the agent to append a line to `.scratch/agents/<agent>.log` after each step, and SHALL read that file instead of the transcript

#### Scenario: Read-only subagent
- **WHEN** the subagent cannot write files
- **THEN** Claude SHALL wait for its final report and SHALL NOT try to read its transcript

#### Scenario: Tool defaults to a temp folder outside the project
- **WHEN** a test tool would create temporary files in a folder outside the project
- **THEN** Claude SHALL point it at `.scratch/` where the tool allows it

#### Scenario: Cleanup
- **WHEN** Claude finishes the work that needed files in `.scratch/`
- **THEN** it SHALL remove the files it created there

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-env-stay-in-repo.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped rule
- **WHEN** the docs check runs and `jois-env-stay-in-repo.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

#### Scenario: Installer delivers the rule
- **WHEN** the installer copies the toolkit's rules
- **THEN** `jois-env-stay-in-repo.md` SHALL be installed alongside the other rules without any installer change

## MODIFIED Requirements

### Requirement: Test mock data rule loads in every session
The toolkit SHALL provide a `jois-test-mock-data` rule at `toolkit/rules/jois-test-mock-data.md` with `metadata.version` and `metadata.last_updated` frontmatter and no `paths:` frontmatter, so it loads in every session and applies to verification steps that touch no code file (a `git push`, a deploy, a request to the user for data). It is exempt from the requirement that core rules be code-scoped. The rule SHALL require that testing and verification of a change use mock or fixture data and mock or stubbed systems by default. It SHALL forbid pushing, publishing, sending, deploying or writing to a real external system, and using real user data, credentials or state, to test or verify a change. It SHALL require that, when test data is needed, Claude first reuse existing fixtures and sample data and derive the data's shape from schemas, types, models and existing tests, then create mock data from that shape and test on it. It SHALL require that mock repos and mock data Claude creates live under the project's `.scratch/` folder as set out in `jois-env-stay-in-repo`, and that verification runs through the project's own `.venv` or `node_modules`, creating the `.venv` as `jois-env-local-installs` says and without asking. It SHALL require that, only when the codebase does not give enough to build mock data, Claude asks the user for mock data or for the data's shape (schema or fields), and SHALL forbid asking the user for real data. It SHALL allow real data or a real system only when the user explicitly asks for it in the current request, and SHALL state that an earlier approval does not carry over. The rule SHALL extend, and not restate, the principle in `jois-code-core-principles` that tests never touch real user state, and SHALL NOT restate the location rules of `jois-env-stay-in-repo`.

#### Scenario: Verification defaults to mock data
- **WHEN** Claude needs to verify a change that reads or writes data
- **THEN** it SHALL use existing fixtures or mock data built from the codebase's schemas, types, models and tests, and SHALL NOT use real data

#### Scenario: Mock data is created inside the project
- **WHEN** Claude has to create mock repos or mock data
- **THEN** it SHALL create them under `.scratch/` in the project and SHALL NOT create them outside the project

#### Scenario: Verification needs a missing venv
- **WHEN** verification needs Python tooling and the project has no `.venv`
- **THEN** Claude SHALL create the `.venv` and run the verification through it, without asking the user

#### Scenario: No real external effect to verify
- **WHEN** Claude wants to see how a push, publish, send or deploy behaves
- **THEN** it SHALL use a mock or stub of that system and SHALL NOT perform the real action

#### Scenario: Codebase is not enough
- **WHEN** the codebase does not give enough to build mock data
- **THEN** Claude SHALL ask the user for mock data or for the shape of the data, and SHALL NOT ask for real data

#### Scenario: Explicit request allows real data
- **WHEN** the user explicitly asks in the current request to use real data or a real system
- **THEN** the rule SHALL allow it for that request only, and an approval given in an earlier request SHALL NOT carry over

#### Scenario: Rule loads without touching code
- **WHEN** a session never reads or creates a source-code file and then verifies a change
- **THEN** the rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-test-mock-data.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped rule
- **WHEN** the docs check runs and `jois-test-mock-data.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

#### Scenario: Installer delivers the rule
- **WHEN** the installer copies the toolkit's rules
- **THEN** `jois-test-mock-data.md` SHALL be installed alongside the other rules without any installer change

### Requirement: Local installs rule loads in every session
The toolkit SHALL provide a `jois-env-local-installs` rule at `toolkit/rules/jois-env-local-installs.md` with `metadata.version` and `metadata.last_updated` frontmatter and no `paths:` frontmatter, so it loads in every session and applies to installs that touch no code file (a `pip install`, an `npm install -g`, a system package manager call). It is exempt from the requirement that core rules be code-scoped. The rule SHALL require that, before installing any package, tool or module, Claude checks where it would land, and that an install proceeds only when it lands inside the project folder (for example `npm ci`, `npm install`, or `pip` run through a project `.venv`). It SHALL forbid installing into a global, user-level or system location, such as `pip install` against the system or user Python, `npm install -g`, and system package managers. It SHALL require that, when an install would land outside the project, Claude makes it local first. For Python this means: look for a `.venv` in the project or in the folder that holds the project's `requirements.txt`; create one with `python -m venv .venv` when none exists; install the requirements file inside it, or the named package inside it when there is no requirements file; and run `pip`, `pytest` and other Python tools through the `.venv`'s interpreter, never the system Python. It SHALL state that a missing `.venv`, or a missing project-local environment of another ecosystem, is never a reason to stop or to ask the user: Claude creates it and carries on, also when it needs the environment only to run tests or checks. It SHALL require that each git worktree use its own `.venv` and not reuse one that lies outside the worktree. It SHALL require that, only when a tool has no project-local way to install, Claude stops and asks the user before installing. It SHALL allow one-off runs that install nothing on the machine, such as `npx`. The rule SHALL NOT restate Python rules that belong to `jois-code-python`.

#### Scenario: Python package needed and no venv exists
- **WHEN** Claude needs `pytest` to run tests and the project has no `.venv`
- **THEN** it SHALL create `.venv` with `python -m venv .venv`, install the requirements file (or `pytest` when there is none) inside it, and run `pytest` through the `.venv`'s interpreter, and SHALL NOT run `pip install` against the system Python

#### Scenario: Missing venv is not a question
- **WHEN** Claude finds no `.venv` and needs one
- **THEN** it SHALL create it without asking the user whether it may

#### Scenario: Venv already exists
- **WHEN** Claude needs a Python package and the project has a `.venv`
- **THEN** it SHALL install the package through the `.venv`'s interpreter and SHALL NOT create a second environment

#### Scenario: Project-local install of another ecosystem
- **WHEN** Claude runs `npm ci` or `npm install` in a project folder
- **THEN** the rule SHALL allow it, because the packages land in the project's `node_modules`

#### Scenario: Global install is refused
- **WHEN** Claude would run `npm install -g`, a global `pip install`, or a system package manager to get a tool
- **THEN** it SHALL NOT run it, SHALL install the tool locally instead if the ecosystem allows it, and SHALL stop and ask the user if it does not

#### Scenario: Worktree gets its own environment
- **WHEN** Claude works in a git worktree that has no `.venv` while the main checkout has one
- **THEN** it SHALL create a `.venv` in the worktree and SHALL NOT use the main checkout's environment

#### Scenario: One-off run installs nothing
- **WHEN** Claude runs a tool through `npx` that installs nothing on the machine
- **THEN** the rule SHALL allow it

#### Scenario: Rule loads without touching code
- **WHEN** a session never reads or creates a source-code file and then runs `pip` or `pytest`
- **THEN** the rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-env-local-installs.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped rule
- **WHEN** the docs check runs and `jois-env-local-installs.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session

#### Scenario: Installer delivers the rule
- **WHEN** the installer copies the toolkit's rules
- **THEN** `jois-env-local-installs.md` SHALL be installed alongside the other rules without any installer change

### Requirement: Commit hygiene rule loads in every session
The toolkit SHALL provide a `jois-git-commit-hygiene` rule at `toolkit/rules/jois-git-commit-hygiene.md` with no `paths:` frontmatter, so it loads in every session whatever file types are touched, and so it applies to commits that contain no source code (generated images, deletions, renames, documentation). The rule SHALL be worded to apply only when a commit is about to be made. It SHALL state that a check which cannot run because the project environment is missing is not a failing check: Claude sets the environment up as `jois-env-local-installs` says, runs the checks, and does not skip them or stop to ask. It is exempt from the requirement that core rules be code-scoped.

#### Scenario: Rule loads without touching code
- **WHEN** a session creates a binary asset or deletes files and then prepares a commit
- **THEN** the jois-git-commit-hygiene rule SHALL already be loaded, because it has no `paths:` restriction

#### Scenario: Rule is inert without a commit
- **WHEN** a session never prepares a commit, or runs outside a git repository
- **THEN** the rule SHALL require nothing of it

#### Scenario: Checks need a missing environment
- **WHEN** Claude is about to commit and the tests cannot run because the project has no `.venv`
- **THEN** it SHALL create the environment, run the tests and judge the commit on their result, and SHALL NOT refuse the commit or ask whether to install

#### Scenario: Docs check accepts the unscoped rule
- **WHEN** the docs check runs and `jois-git-commit-hygiene.md` has no `paths:` frontmatter
- **THEN** it SHALL NOT report the rule as a technology rule missing `paths:`

#### Scenario: Docs check rejects a scoped commit rule
- **WHEN** the docs check runs and `jois-git-commit-hygiene.md` has `paths:` frontmatter
- **THEN** it SHALL fail and name the file, because the rule must load in every session
