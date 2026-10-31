## ADDED Requirements

### Requirement: Local installs rule loads in every session
The toolkit SHALL provide a `jois-env-local-installs` rule at `toolkit/rules/jois-env-local-installs.md` with `metadata.version` and `metadata.last_updated` frontmatter and no `paths:` frontmatter, so it loads in every session and applies to installs that touch no code file (a `pip install`, an `npm install -g`, a system package manager call). It is exempt from the requirement that core rules be code-scoped. The rule SHALL require that, before installing any package, tool or module, Claude checks where it would land, and that an install proceeds only when it lands inside the project folder (for example `npm ci`, `npm install`, or `pip` run through a project `.venv`). It SHALL forbid installing into a global, user-level or system location, such as `pip install` against the system or user Python, `npm install -g`, and system package managers. It SHALL require that, when an install would land outside the project, Claude makes it local first. For Python this means: look for a `.venv` in the project or in the folder that holds the project's `requirements.txt`; create one with `python -m venv .venv` when none exists; install the requirements file inside it, or the named package inside it when there is no requirements file; and run `pip`, `pytest` and other Python tools through the `.venv`'s interpreter, never the system Python. It SHALL require that each git worktree use its own `.venv` and not reuse one that lies outside the worktree. It SHALL require that, when a tool has no project-local way to install, Claude stops and asks the user before installing. It SHALL allow one-off runs that install nothing on the machine, such as `npx`. The rule SHALL NOT restate Python rules that belong to `jois-code-python`.

#### Scenario: Python package needed and no venv exists
- **WHEN** Claude needs `pytest` to run tests and the project has no `.venv`
- **THEN** it SHALL create `.venv` with `python -m venv .venv`, install the requirements file (or `pytest` when there is none) inside it, and run `pytest` through the `.venv`'s interpreter, and SHALL NOT run `pip install` against the system Python

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
