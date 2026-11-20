# Spec Delta

## MODIFIED Requirements

### Requirement: Story skills are toolkit skills
The toolkit SHALL hold the six story skills as `toolkit/skills/jois-story-explore/`, `jois-story-propose/`, `jois-story-review/`, `jois-story-design/`, `jois-story-plan/` and `jois-story-verify/`, each with a `SKILL.md` carrying `name`, `description`, `metadata.version` and `metadata.last_updated`. The installer SHALL install them like any other skill.

#### Scenario: Skills are listed with a version
- **WHEN** the installer is run with `-List`
- **THEN** each of the six skills shows with its version and a status

#### Scenario: Skill loads in another folder
- **WHEN** a session is started in a folder outside this repository after a global install
- **THEN** each of the six skills is available in that session
