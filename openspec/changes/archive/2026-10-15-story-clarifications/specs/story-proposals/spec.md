## MODIFIED Requirements

### Requirement: Accept proposed stories
The Proposed tab SHALL let the user tick any number of proposed stories and SHALL offer **Accept selected (n)**, which moves exactly the ticked stories, and **Accept all** for every proposed story. Accepting SHALL move each accepted story, with all its fields and any unknown columns (including `Clarifications`), from the proposals file into the backlog and remove it from the proposals file; stories that were not ticked SHALL stay proposed. **Accept selected** SHALL be disabled while nothing is ticked. A story without an Epic SHALL NOT be accepted, and the user SHALL be told why. A **benched** story SHALL NOT be accepted: the user unbenches it first, and the user SHALL be told why. Open questions in `Clarifications` SHALL NOT prevent accepting. If any story in the request cannot be accepted, none SHALL be moved.

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

#### Scenario: Benched story
- **WHEN** a ticked story is benched and the user accepts the selection
- **THEN** nothing moves and a message says the story is benched

#### Scenario: Accept all with a benched story
- **WHEN** one of the proposed stories is benched and the user chooses Accept all
- **THEN** nothing moves and a message says a story is benched

#### Scenario: Open questions do not block
- **WHEN** an unbenched story with open questions is accepted
- **THEN** it moves to the backlog with its `Clarifications` unchanged

#### Scenario: Nothing ticked
- **WHEN** no story is ticked
- **THEN** Accept selected is disabled
