## MODIFIED Requirements

### Requirement: Create a new file
Creating a backlog is described by the `backlog-folder-layout` capability: the server SHALL make the folder with all its starting files, and the request SHALL NOT need to carry file content. The system SHALL NOT overwrite an existing backlog. Creating the file of another kind in an existing backlog SHALL still never overwrite it.

#### Scenario: Name is free
- **WHEN** a client creates `new-backlog` and no such folder exists
- **THEN** the backlog is created with its starting files and `new-backlog` is returned

#### Scenario: Name is taken
- **WHEN** a client creates `new-backlog` and it already exists
- **THEN** `new-backlog-2` is created, the original is untouched and `new-backlog-2` is returned
