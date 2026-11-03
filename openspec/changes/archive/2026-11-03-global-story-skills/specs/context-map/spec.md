# Spec Delta

## MODIFIED Requirements

### Requirement: Map files
A backlog's context map SHALL be two files in the backlog folder, `<backlog>/context-map.json` (the source) and `context-map.md` (the document), and SHALL NOT be a folder. The map SHALL be optional: a backlog without one works as before. The slice read script SHALL NOT list the map as a slice.

#### Scenario: No map
- **WHEN** a backlog has no `context-map.json`
- **THEN** `jois-story-plan` works as before and nothing reports the map as missing

#### Scenario: Map is not a slice
- **WHEN** the slice read script lists the slices of a backlog that has a map
- **THEN** the map is not among them

### Requirement: Map tools
The `jois-story-plan` skill SHALL have a script that reads the map, a check that validates a map and writes nothing (the map writer's `--check`), and a writer script, run with Bash, that writes it. The write SHALL apply the same checks, write the source and the document atomically, read them back and fail naming what is missing, change nothing when the same map is sent again, never delete a file, write only under the backlog's folder, and append a line to `planner/data/logs/writes.jsonl` with no contents. A refused write SHALL write neither file. The writer SHALL refuse, naming the skill folder and `npm ci`, when the packages of Mermaid's parser are not installed.

#### Scenario: Repeated write
- **WHEN** the same map is written twice
- **THEN** the second run changes no byte and says nothing changed

#### Scenario: Refused write
- **WHEN** a map fails a check
- **THEN** neither file is written and the reply lists each problem
