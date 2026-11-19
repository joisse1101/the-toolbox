## MODIFIED Requirements

### Requirement: A frozen story is read-only
In the portal, every field of a frozen story SHALL be read-only: Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria, Notes and Clarifications. A frozen story SHALL be marked as frozen in the story list and in the Stories tab, and its form SHALL say that it is frozen and read-only. It SHALL NOT be draggable, SHALL NOT be moved to Proposed, SHALL NOT be deleted, and a bulk edit and a bulk delete SHALL skip it and say how many frozen stories were skipped. A review suggestion for a frozen story SHALL be shown without an enabled Apply. Another story MAY still list a frozen story in its own `Depends On`, because that edits the other story. A frozen story SHALL still be shown, selected, searched and read like any other.

#### Scenario: Fields are read-only
- **WHEN** a frozen story is open in the Editor tab
- **THEN** the form says it is frozen and none of its fields can be edited

#### Scenario: Not draggable
- **WHEN** the user tries to drag a frozen story
- **THEN** it does not move

#### Scenario: Bulk edit skips it
- **WHEN** five stories are selected, two of them frozen, and the user applies an Epic to the selection
- **THEN** the three stories that are not frozen get the Epic, the two frozen ones are unchanged, and the message says 2 frozen stories were skipped

#### Scenario: Depended on by another story
- **WHEN** the user adds a frozen story to the Depends On of a story that is not frozen
- **THEN** the dependency is saved and the frozen story is unchanged
