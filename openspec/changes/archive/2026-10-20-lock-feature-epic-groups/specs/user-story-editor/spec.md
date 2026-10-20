## ADDED Requirements

### Requirement: Lock and unlock a group
Each Epic header and each Feature header in the Editor tab's story list SHALL offer a lock button that locks or unlocks every story of that group at once. A group is the stories listed under that header, so a Feature group is the stories of that Feature within its Epic. The button SHALL lock the group when at least one of its stories is unlocked, and SHALL unlock the group when all of its stories are locked. Locking SHALL lock every story of the group that has an ID and skip the others; when any were skipped the tool SHALL say how many ("n skipped (no ID)"). Both actions SHALL save through the normal auto-save and SHALL NOT change any other field or any ID.

The header SHALL show the group's lock state, worked out from its stories: a lock mark when all of them are locked, a distinct partial mark when some are, and no mark when none are. The button SHALL be usable on a collapsed group, SHALL NOT also fold or unfold it, SHALL NOT start a drag of the group, and SHALL be reachable by keyboard. A group lock is not stored: it only sets the `Locked` column of the stories the group holds at that moment, so a story added to, dragged into or given the Feature of a locked group later is unlocked until the group is locked again. A locked story keeps every rule of "Lock a story". The story list of the Proposed tab SHALL NOT offer the button.

#### Scenario: Lock a feature
- **WHEN** the feature "Sign in" holds three unlocked stories and the user clicks its lock button
- **THEN** the three stories are locked, the header shows the lock mark, and the saved rows have `Yes` in `Locked`

#### Scenario: Lock an epic
- **WHEN** the epic "Identity" holds two features, one with a locked story and one with unlocked stories, and the user clicks the epic's lock button
- **THEN** every story of both features is locked

#### Scenario: Unlock a group
- **WHEN** every story of a feature is locked and the user clicks its lock button
- **THEN** every story of the feature is unlocked and the header shows no mark

#### Scenario: Partly locked group
- **WHEN** a feature holds one locked and two unlocked stories
- **THEN** the header shows the partial mark, and clicking its lock button locks the other two

#### Scenario: Stories without an ID are skipped
- **WHEN** a feature under a blank Epic holds two stories and the user clicks its lock button
- **THEN** nothing is locked and the message says 2 were skipped (no ID)

#### Scenario: Collapsed group
- **WHEN** a feature is collapsed and the user clicks its lock button
- **THEN** its stories are locked and the feature stays collapsed

#### Scenario: Later additions are not locked
- **WHEN** a feature is locked and the user then adds a story to it
- **THEN** the new story is unlocked and the header shows the partial mark

#### Scenario: Proposed list has no group lock
- **WHEN** the Proposed tab's story list is shown
- **THEN** its Epic and Feature headers have no lock button
