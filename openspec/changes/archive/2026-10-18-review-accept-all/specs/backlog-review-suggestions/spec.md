## ADDED Requirements

### Requirement: Accept all in the Review tab
The Review tab SHALL offer an **Accept all** button in its header, which applies the open suggestions of every Area section, and an **Accept all** button on each Area section, which applies only the open suggestions of that section. A button SHALL be disabled when its scope has no open suggestion. Before anything is applied the tool SHALL ask the user to confirm, saying how many suggestions will be applied; declining SHALL change nothing.

Accept all SHALL apply the eligible suggestions one after the other in the order the tab lists them, each against the backlog as the previous one left it, with the same effect as clicking Apply on each. A suggestion SHALL NOT be applied, and SHALL stay open and unchanged, when it is an `unlock` row, when its story is locked, when any of its rows has `Confidence` = `confirm`, or when it cannot be applied at that point (it is stale, or applying it would be refused, for example because it would close a dependency cycle). A split group SHALL count as one suggestion. A suggestion that cannot be applied SHALL NOT stop the run: the next one is still tried.

The backlog edits of one run and the `applied` status of the rows it applied SHALL be saved like those of a single Apply. When the run ends the tool SHALL say how many suggestions were applied and how many were left open, with the number left for each reason (unlock row, locked story, needs a check, could not be applied).

#### Scenario: Accept all in the header
- **WHEN** the Review tab has 5 open suggestions that are all eligible and the user clicks Accept all in the header and confirms
- **THEN** all 5 are applied to the backlog, their rows are `applied`, and the tool reports 5 applied and none left open

#### Scenario: Accept all for one Area
- **WHEN** the tab has open suggestions in Hierarchy and INVEST and the user clicks Accept all on the INVEST section and confirms
- **THEN** only the INVEST suggestions are applied and the Hierarchy ones stay open

#### Scenario: Confirm default skipped
- **WHEN** an open suggestion has `Confidence` = `confirm` and the user accepts all
- **THEN** it is not applied, it stays open, and the summary counts it as needing a check

#### Scenario: Locked story skipped
- **WHEN** an open field-edit suggestion belongs to a locked story and the user accepts all
- **THEN** it is not applied and stays open

#### Scenario: Unlock row skipped
- **WHEN** the tab has an open `unlock` row and the user accepts all
- **THEN** the story stays locked and the row stays open

#### Scenario: Suggestion that cannot be applied
- **WHEN** applying an earlier suggestion of the run makes a later one stale
- **THEN** the later one is not applied and stays open, and the suggestions after it are still applied

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** the backlog and the review file are unchanged

#### Scenario: Nothing eligible
- **WHEN** every open suggestion in the scope is skipped
- **THEN** nothing is applied and the summary says so, with the reasons
