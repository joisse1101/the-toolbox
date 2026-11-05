# Spec Delta

## MODIFIED Requirements

### Requirement: Story skills are toolkit skills
The toolkit SHALL hold the five story skills as `toolkit/skills/jois-story-explore/`, `jois-story-propose/`, `jois-story-review/`, `jois-story-plan/` and `jois-story-verify/`, each with a `SKILL.md` carrying `name`, `description`, `metadata.version` and `metadata.last_updated`. The installer SHALL install them like any other skill.

#### Scenario: Skills are listed with a version
- **WHEN** the installer is run with `-List`
- **THEN** each of the five skills shows with its version and a status

#### Scenario: Skill loads in another folder
- **WHEN** a session is started in a folder outside this repository after a global install
- **THEN** each of the five skills is available in that session

### Requirement: Story commands are a toolkit namespace
The toolkit SHALL hold the commands `propose`, `re-read`, `review` and `verify` as `toolkit/commands/jois-story/*.md`, installed as `/jois-story:propose`, `/jois-story:re-read`, `/jois-story:review` and `/jois-story:verify`. Each file SHALL carry `metadata.version` and `metadata.last_updated`. A command SHALL do what its `/story:*` predecessor did, where it has one.

#### Scenario: Commands are installed under the namespace
- **WHEN** the toolkit is installed globally
- **THEN** `~/.claude/commands/jois-story/` holds the four command files

#### Scenario: Old commands are not kept
- **WHEN** the change is complete
- **THEN** `.claude/commands/story/` no longer exists in this repository

### Requirement: Writes go only through the bundled writers
A story skill SHALL write to the data only by running a writer script with Bash: its own bundled writer, or, for `jois-story-verify`, the writer of the installed `jois-story-plan` or `jois-story-review` skill. Each writer SHALL keep its validation, all-or-nothing write and read-back, and SHALL accept `--check` to validate and report without writing. A writer SHALL refuse a target outside the data folder.

#### Scenario: Check writes nothing
- **WHEN** a writer is run with `--check` on a valid draft
- **THEN** it reports what it would write and no file changes

#### Scenario: Invalid draft writes nothing
- **WHEN** a writer is run on a draft with one invalid item
- **THEN** it names the item and writes nothing

#### Scenario: Target outside the data folder
- **WHEN** a writer is given a backlog name that resolves outside the data folder
- **THEN** it refuses and writes nothing

#### Scenario: Verify uses another skill's writer
- **WHEN** `jois-story-verify` writes a corrected slice
- **THEN** it runs `write-diagram.mjs` from the installed `jois-story-plan` folder and carries no copy of it
