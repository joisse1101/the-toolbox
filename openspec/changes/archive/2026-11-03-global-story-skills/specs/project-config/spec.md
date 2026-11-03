# Spec Delta

## MODIFIED Requirements

### Requirement: Every consumer uses the config
The portal server SHALL take the data directory from the project config through the planner's own resolution. The story skills SHALL take the same directory from the same config, found as the `toolkit-story-skills` capability describes, reading the `dataDir` key only. A story skill's script SHALL NOT import the planner's resolution.

#### Scenario: Config changed, script run
- **WHEN** the config's `dataDir` is changed and a skill script is started afterwards
- **THEN** the script reads and writes in the new directory
