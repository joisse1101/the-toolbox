## MODIFIED Requirements

### Requirement: Move a backlog story to Proposed
The story form in the Editor tab SHALL offer **Move to Proposed** for the open story, in the header row beside its ID. Moving SHALL remove the story from the backlog and add it, with all its fields and unknown columns, to the end of the proposals file under a new placeholder ID `NEW-<n>` chosen by the placeholder rule. The story's own `Depends On` entries SHALL stay as they are. Every `Depends On` entry in the backlog and in the proposals file that named the story's old ID SHALL be rewritten to the new placeholder, and the backlog IDs SHALL then be recomputed by the normal rule. A story without an ID (no Epic yet) SHALL NOT be movable and the button SHALL be disabled for it. A locked story SHALL NOT be movable either: the button SHALL be disabled for it with a hint to unlock it first. The move SHALL be saved to both files like an accept. A story accepted into the backlog SHALL be unlocked.

#### Scenario: Move one story
- **WHEN** the user moves `IAM-0003` to Proposed
- **THEN** it is gone from the backlog, it is in the proposals file as `NEW-<n>` with its other fields unchanged, and the unlocked backlog stories below it have shifted up

#### Scenario: Links follow the story
- **WHEN** `IAM-0005` depends on `IAM-0003` and `IAM-0003` is moved to Proposed
- **THEN** `IAM-0005` (under its new ID) depends on `NEW-<n>` and is flagged as depending on a proposed story

#### Scenario: Own dependencies kept
- **WHEN** a story depending on `IAM-0002` is moved to Proposed
- **THEN** the proposed story still depends on that backlog story

#### Scenario: No Epic
- **WHEN** a story has no ID because it has no Epic
- **THEN** Move to Proposed is disabled

#### Scenario: Locked story
- **WHEN** a story is locked
- **THEN** Move to Proposed is disabled and says to unlock the story first

#### Scenario: Round trip
- **WHEN** a moved story is accepted again
- **THEN** it is placed at the end of its Epic by the normal placement rule, not at its old position, and it is unlocked
