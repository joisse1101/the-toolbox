# Spec Delta

## ADDED Requirements

### Requirement: A skill may carry scripts and packages
A skill folder MAY hold scripts, a `lib/` folder, a `references/` folder and a `package.json` with a `package-lock.json` beside it, in addition to its `SKILL.md`. The docs check SHALL fail and name the skill when a `package.json` has no `package-lock.json`, and when a script of the skill imports a path outside the skill's folder.

#### Scenario: Skill with scripts passes the check
- **WHEN** a skill holds `SKILL.md`, scripts and `lib/` that import only inside the folder
- **THEN** the docs check passes for that skill

#### Scenario: Package file without a lock file
- **WHEN** a skill has a `package.json` and no `package-lock.json`
- **THEN** the docs check fails and names the skill

#### Scenario: Script imports outside the skill
- **WHEN** a script of a skill imports a path that resolves outside the skill's folder
- **THEN** the docs check fails and names the file

### Requirement: Installer installs a skill's packages
When the installer installs or replaces a skill that has a `package.json`, it SHALL run `npm ci` in that skill's destination folder after copying its files, and SHALL NOT run it for a skill reported as up to date. A switch SHALL skip the step and print the folder and the command instead. When `npm` is missing or `npm ci` fails, the skill's files SHALL stay installed, the installer SHALL print the folder and the command to run, continue with the other items and end with a non-zero exit code.

#### Scenario: Packages installed with the skill
- **WHEN** a skill with a `package.json` is installed and `npm` is available
- **THEN** `npm ci` runs in the destination folder and the skill's packages are present afterwards

#### Scenario: Up-to-date skill is not touched
- **WHEN** the installer runs and the skill is already up to date
- **THEN** no `npm ci` runs

#### Scenario: Step skipped by the switch
- **WHEN** the installer is run with the switch that skips packages
- **THEN** it runs no package manager and prints the destination folder and `npm ci`

#### Scenario: npm is missing or fails
- **WHEN** `npm` is not found or `npm ci` fails
- **THEN** the skill's files stay installed, the folder and command are printed, the other items are still installed and the exit code is non-zero

## MODIFIED Requirements

### Requirement: No silent overwrite of a differing item
If a destination skill, command item, rule or agent already exists and its contents differ from the
toolkit's, the installer SHALL NOT overwrite it unless explicitly told to, and SHALL report that it
differs. A `node_modules` folder inside a skill SHALL NOT count as part of the item when contents are compared.

#### Scenario: Drifted copy present
- **WHEN** the destination item differs from the toolkit's copy and no force option is given
- **THEN** that item SHALL be left unchanged and reported as differing

#### Scenario: Identical copy present
- **WHEN** the destination item is identical to the toolkit's
- **THEN** the installer SHALL report it as up to date and change nothing

#### Scenario: Installed packages do not make a skill differ
- **WHEN** a skill's folder at the destination holds a `node_modules` folder created by `npm ci` and its other files match the toolkit's
- **THEN** the installer SHALL report it as up to date

### Requirement: Jois command files are versioned
Each command file under `toolkit/commands/jois-git/`, `toolkit/commands/jois-init/`, `toolkit/commands/jois-code/`, `toolkit/commands/jois-docs/` and `toolkit/commands/jois-story/` SHALL declare `metadata.version` (semver) and `metadata.last_updated`
(a date) in its frontmatter, and the docs check SHALL fail and name a file where either is missing or
malformed.

#### Scenario: Missing version
- **WHEN** `toolkit/commands/jois-git/stage.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Setup command is checked too
- **WHEN** `toolkit/commands/jois-init/opsx.md` has no `metadata.last_updated`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Orchestrator command is checked too
- **WHEN** `toolkit/commands/jois-code/apply.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Docs command is checked too
- **WHEN** `toolkit/commands/jois-docs/meeting-minutes.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Story command is checked too
- **WHEN** `toolkit/commands/jois-story/propose.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file
