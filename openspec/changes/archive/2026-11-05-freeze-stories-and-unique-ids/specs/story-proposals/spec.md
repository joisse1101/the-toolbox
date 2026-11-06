## ADDED Requirements
### Requirement: Move an unfrozen backlog story to Proposed
The story form in the Editor tab SHALL offer **Move to Proposed** for the open story, in the header row beside its ID. Moving SHALL remove the story from the backlog and add it, with all its fields and unknown columns, to the end of the proposals file under a new placeholder ID `NEW-<n>` chosen by the placeholder rule. The story's own `Depends On` entries SHALL stay as they are. Every `Depends On` entry in the backlog and in the proposals file that named the story's old ID SHALL be rewritten to the new placeholder, and the backlog IDs SHALL then be recomputed by the normal rule. A story without an ID (no Epic yet) SHALL NOT be movable and the button SHALL be disabled for it. A frozen story SHALL NOT be movable either: the button SHALL be disabled for it with a hint that a frozen story cannot be moved. A proposed story SHALL never be frozen, and a story accepted into the backlog SHALL start unfrozen. The move SHALL be saved to both files like an accept.

#### Scenario: Move one story
- **WHEN** the user moves `B1-IAM-0003` to Proposed
- **THEN** it is gone from the backlog, it is in the proposals file as `NEW-<n>` with its other fields unchanged, and the unfrozen backlog stories below it have shifted up

#### Scenario: Links follow the story
- **WHEN** `B1-IAM-0005` depends on `B1-IAM-0003` and `B1-IAM-0003` is moved to Proposed
- **THEN** `B1-IAM-0005` (under its new ID) depends on `NEW-<n>` and is flagged as depending on a proposed story

#### Scenario: Own dependencies kept
- **WHEN** a story depending on `B1-IAM-0002` is moved to Proposed
- **THEN** the proposed story still depends on that backlog story

#### Scenario: No Epic
- **WHEN** a story has no ID because it has no Epic
- **THEN** Move to Proposed is disabled

#### Scenario: Frozen story
- **WHEN** a story is frozen
- **THEN** Move to Proposed is disabled and its hint says a frozen story cannot be moved

#### Scenario: Round trip
- **WHEN** a moved story is accepted again
- **THEN** it is placed at the end of its Epic by the normal placement rule, not at its old position, and it is not frozen

## REMOVED Requirements
### Requirement: Move a backlog story to Proposed
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.
