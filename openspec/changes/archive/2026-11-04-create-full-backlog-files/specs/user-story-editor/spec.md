## MODIFIED Requirements

### Requirement: Create a new backlog
The tool SHALL provide one "New" action in the file bar, and no other control that creates a backlog. It SHALL immediately create a backlog named `new-backlog` (numbered if taken) with all its starting files empty, as the `backlog-folder-layout` capability describes, select it in the dropdown, open it with one blank story, and focus its name for renaming. It SHALL NOT build the backlog from the one that is open or from any other.

#### Scenario: First new backlog
- **WHEN** the user clicks New and `new-backlog` does not exist
- **THEN** `new-backlog` is created with its starting files, selected, shown with one blank story, and its name is editable

#### Scenario: Name taken
- **WHEN** the user clicks New and `new-backlog` exists
- **THEN** `new-backlog-2` is created and selected, and `new-backlog` is unchanged

#### Scenario: Another backlog is open
- **WHEN** the user clicks New while a backlog with stories, terms and proposals is open
- **THEN** the new backlog has none of them

#### Scenario: One New button
- **WHEN** the file bar is shown
- **THEN** it holds a single New button for backlogs
