## ADDED Requirements

### Requirement: Move a backlog story to Proposed
The story form in the Editor tab SHALL offer **Move to Proposed** for the open story, in the header row beside its ID. Moving SHALL remove the story from the backlog and add it, with all its fields and unknown columns, to the end of the proposals file under a new placeholder ID `NEW-<n>` chosen by the placeholder rule. The story's own `Depends On` entries SHALL stay as they are. Every `Depends On` entry in the backlog and in the proposals file that named the story's old ID SHALL be rewritten to the new placeholder, and the backlog IDs SHALL then be recomputed by the normal rule. A story without an ID (no Epic yet) SHALL NOT be movable and the button SHALL be disabled for it. The move SHALL be saved to both files like an accept.

#### Scenario: Move one story
- **WHEN** the user moves `IAM-0003` to Proposed
- **THEN** it is gone from the backlog, it is in the proposals file as `NEW-<n>` with its other fields unchanged, and the backlog stories below it have shifted up

#### Scenario: Links follow the story
- **WHEN** `IAM-0005` depends on `IAM-0003` and `IAM-0003` is moved to Proposed
- **THEN** `IAM-0005` (under its new ID) depends on `NEW-<n>` and is flagged as depending on a proposed story

#### Scenario: Own dependencies kept
- **WHEN** a story depending on `IAM-0002` is moved to Proposed
- **THEN** the proposed story still depends on that backlog story

#### Scenario: No Epic
- **WHEN** a story has no ID because it has no Epic
- **THEN** Move to Proposed is disabled

#### Scenario: Round trip
- **WHEN** a moved story is accepted again
- **THEN** it is placed at the end of its Epic by the normal placement rule, not at its old position

## MODIFIED Requirements

### Requirement: Accept proposed stories
The Proposed tab SHALL let the user tick any number of proposed stories and SHALL offer **Accept selected (n)**, which moves exactly the ticked stories, and **Accept all** for every proposed story. Accepting SHALL move each accepted story, with all its fields and any unknown columns, from the proposals file into the backlog and remove it from the proposals file; stories that were not ticked SHALL stay proposed. **Accept selected** SHALL be disabled while nothing is ticked. A story without an Epic SHALL NOT be accepted, and the user SHALL be told why. If any story in the request cannot be accepted, none SHALL be moved.

#### Scenario: Accept one
- **WHEN** the user ticks one proposed story and accepts the selection
- **THEN** it is in the backlog, it is gone from the proposals file, and the other proposed stories remain

#### Scenario: Accept some
- **WHEN** the user ticks 2 of 5 proposed stories and accepts the selection
- **THEN** those 2 are in the backlog, they are gone from the proposals file, and the other 3 remain

#### Scenario: Accept all
- **WHEN** the user accepts all
- **THEN** every proposed story is in the backlog and the proposals file has no stories

#### Scenario: No Epic
- **WHEN** a ticked story has no Epic and the user accepts the selection
- **THEN** nothing moves and a message says the story needs an Epic

#### Scenario: Nothing ticked
- **WHEN** no story is ticked
- **THEN** Accept selected is disabled
