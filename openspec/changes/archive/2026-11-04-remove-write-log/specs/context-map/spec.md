# Spec Delta

## MODIFIED Requirements

### Requirement: Map tools
The `jois-story-plan` skill SHALL have a script that reads the map, a check that validates a map and writes nothing (the map writer's `--check`), and a writer script, run with Bash, that writes it. The write SHALL apply the same checks, write the source and the document atomically, read them back and fail naming what is missing, change nothing when the same map is sent again, never delete a file, and write only under the backlog's folder. A refused write SHALL write neither file. The writer SHALL refuse, naming the skill folder and `npm ci`, when the packages of Mermaid's parser are not installed.

#### Scenario: Repeated write
- **WHEN** the same map is written twice
- **THEN** the second run changes no byte and says nothing changed

#### Scenario: Refused write
- **WHEN** a map fails a check
- **THEN** neither file is written and the reply lists each problem
