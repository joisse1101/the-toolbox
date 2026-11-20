# Spec Delta

## MODIFIED Requirements

### Requirement: Restore to a stage
The script SHALL accept a stage name and build the mock repo as it stands at that stage: `baseline`, `proposed`, `accepted`, `designed`, `planned`, `built`, `validated` or `archived`. An unknown stage SHALL stop the script with the list of valid names.

#### Scenario: Start at apply
- **WHEN** the script runs with the stage `planned`
- **THEN** the mock repo holds the baseline code, the accepted backlog and the planned slice, and the slice's first task is not ticked

#### Scenario: Start at plan
- **WHEN** the script runs with the stage `designed`
- **THEN** the mock repo holds the baseline code, the accepted backlog and `designs.json` pointing at the sample canvas, and no slice

### Requirement: Saved stage results
`stages/` SHALL hold one folder per stage with what that stage of the flow writes: the proposals, the accepted backlog, the design pointer `designs.json`, the planned slice (`UC-<slice>.md`, `tasks.md`, `source.json`), the built code as a patch against the baseline app with the ticked `tasks.md` and `review.md`, `validation.md`, and the archived wiki pages with `ARCHIVED.md`. The results SHALL come from one real run of the flow and SHALL contain no content from a real backlog or repo.

#### Scenario: Built stage holds a patch
- **WHEN** a person opens the `built` stage
- **THEN** the code appears as a patch that applies cleanly to the baseline app

#### Scenario: Designed stage holds only a pointer
- **WHEN** a person opens the `designed` stage
- **THEN** it holds `designs.json` and no artboard content

## ADDED Requirements

### Requirement: The sample canvas is created once and then only read
The sample SHALL use one private Claude Design canvas for its designed feature. It SHALL be created only during a recording, with the user's explicit approval. The build script, the staleness check, the test suites and a live test of a later stage SHALL only read it and SHALL NOT publish to it.

#### Scenario: Live test of apply
- **WHEN** a person builds the mock repo at `planned` and runs apply with subagents
- **THEN** the agents open the sample canvas's artboards, and nothing is published

#### Scenario: Canvas cannot be opened
- **WHEN** the sample canvas is deleted or not shared with the person running the test
- **THEN** the README says the `designed` stage and later stages need the canvas recorded again, which needs the user's approval
