# Spec Delta

## MODIFIED Requirements

### Requirement: Nothing in the toolkit imports the planner
No file under `toolkit/` SHALL import or read a path under `viewer/`. Each story skill SHALL run from its own folder and import only files inside that folder and the packages it declares.

#### Scenario: Scripts import inside their folder
- **WHEN** every script of a story skill is searched for imports
- **THEN** each import resolves inside the skill's own folder or to a package in its own `package.json`

### Requirement: Diagram logic belongs to the plan skill
The logic for checking and writing diagrams, slices and the context map SHALL live in `jois-story-plan` and SHALL NOT remain under `viewer/`. The portal SHALL NOT import it.

#### Scenario: Portal builds without diagram logic
- **WHEN** the portal is built and the viewer tests run
- **THEN** they pass with no diagram logic under `viewer/shared/`

### Requirement: Guidelines are bundled with the skills
Each story skill SHALL carry the guidelines it cites, as generated copies in its `references/` folder, and SHALL cite them from there. The viewer's `viewer/shared/guidelines/` SHALL remain the source.

#### Scenario: Guidelines are found outside this repo
- **WHEN** a story skill runs in a folder that has no `viewer/shared/guidelines/`
- **THEN** it reads the guidelines from its own `references/` folder
