# Spec Delta

## ADDED Requirements

### Requirement: A claim carries its task's artboards
For a slice, a claim built from a task that has a `Design` line SHALL carry that line's artboard links, so that the agent testing the claim knows which artboards show the expected screen.

#### Scenario: Claim from a screen task
- **WHEN** a task with a `Design` line naming two artboards satisfies a criterion
- **THEN** the claim for that criterion lists both artboard links

### Requirement: A user-interface claim is judged against its artboards
The `code-validator` agent SHALL have the `Artifact` tool. For a user-interface claim with artboard links, it SHALL open each artboard and compare the page it drives with the artboard's layout, copy and states. A difference that the claim's criterion covers SHALL make the claim `not met`, with the artboard link and what differs as evidence.

#### Scenario: Error message differs
- **WHEN** the artboard shows "That name is taken" and the page shows "Error"
- **THEN** the claim is `not met`, with the artboard link and both texts as evidence

#### Scenario: Mobile artboard
- **WHEN** a claim links a mobile artboard
- **THEN** the agent drives the page at the mobile artboard's width and compares it with that artboard

#### Scenario: Artboard cannot be opened
- **WHEN** an artboard link fails to open
- **THEN** the claim is `could not test`, with the link and the error as evidence

### Requirement: Validate copies no artboard
Validate SHALL NOT copy an artboard, its markup or a screenshot of it into the checkout's tracked files or the slice folder. A file that a read saves SHALL go under `.scratch/`.

#### Scenario: Validation with artboards
- **WHEN** a slice run with artboard links ends
- **THEN** the slice folder holds only the result file, and no artboard content is in it beyond the links
