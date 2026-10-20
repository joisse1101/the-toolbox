## ADDED Requirements

### Requirement: Collapse and expand story groups
In the story panel of the Editor tab, the user SHALL be able to collapse and expand every Epic group, and every Feature group, with one control each. Stories belong to exactly one Epic and one Feature, so the panel has two levels of group: Epic, then Feature, then stories. The panel SHALL show two toggle buttons, one for Epics and one for Features. The Epic button SHALL read "Collapse epics" while at least one Epic group is expanded and "Expand epics" when all are collapsed; the Feature button SHALL read "Collapse features" or "Expand features" by the same rule over all Feature groups, including those inside a collapsed Epic. Collapsing all Epics SHALL show only the Epic heads. Collapsing all Features SHALL leave the Epic groups as they are and show no stories, only the Feature heads of every expanded Epic. Each button SHALL change only the groups of its own level, so expanding a collapsed Epic shows its Features as they were. Collapsing or expanding SHALL NOT change the backlog, the order of rows in the saved file, the selection, or the dragging of groups.

The collapsed state of each Epic and each Feature SHALL be remembered in the browser, separately for each backlog file, and SHALL be restored when the backlog is opened again, including after a reload. A group is identified by its Epic name (and Feature name), not by a story ID. An Epic or Feature that has no remembered state, including one that is new or renamed, SHALL start expanded. The remembered state of an Epic or Feature that is no longer in the loaded backlog, because its stories were deleted, moved or renamed, or because the backlog changed on disk and was re-read, SHALL be forgotten; this SHALL NOT happen while the backlog is still loading, while another backlog file is being opened, or when the file cannot be read. When the browser cannot store the state, the controls SHALL still work until the page closes.

When a story appears inside a collapsed group, the panel SHALL expand only that story's Feature group and the Epic group that holds it, and SHALL leave the state of every other group unchanged. This SHALL happen when a story is added with "Add story", when a story is accepted from the Proposed tab (for each accepted story), and when the Epic or Feature of the selected story changes. The Proposed tab's story list SHALL NOT have the bulk buttons and SHALL NOT remember its collapsed state.

#### Scenario: Collapse all epics
- **WHEN** the panel shows the Epics "Billing" and "Onboarding" expanded and the user presses "Collapse epics"
- **THEN** only the heads of "Billing" and "Onboarding" are shown, and the button now reads "Expand epics"

#### Scenario: Collapse all features keeps epics open
- **WHEN** both Epics are expanded and the user presses "Collapse features"
- **THEN** each Epic still shows its Feature heads, no story rows are shown, and the button now reads "Expand features"

#### Scenario: Levels are independent
- **WHEN** the user collapses all Features, then collapses all Epics, then expands the Epic "Billing"
- **THEN** "Billing" shows its Feature heads, all collapsed, and "Onboarding" is still collapsed

#### Scenario: Expand all features inside a collapsed epic
- **WHEN** the Epic "Billing" is collapsed, one of its Features is expanded, and the user looks at the Feature button
- **THEN** it reads "Collapse features", because that hidden Feature is still expanded

#### Scenario: State survives a reload
- **WHEN** the user collapses the Feature "Pay" of "Billing" in `shop.csv` and reloads the page
- **THEN** after the backlog is opened, "Pay" is still collapsed, and the state of another backlog file is unaffected

#### Scenario: Deleted feature is forgotten
- **WHEN** the Feature "Pay" of "Billing" is collapsed and the user deletes its last story, then adds a story with Epic "Billing" and Feature "Pay"
- **THEN** "Pay" is expanded, because its earlier state was forgotten when the group disappeared

#### Scenario: Refresh after an outside edit
- **WHEN** the Epic "Billing" is collapsed, the backlog file is edited outside the tool so that "Billing" no longer exists, and the tool re-reads the file when the tab regains focus
- **THEN** the remembered state of "Billing" is forgotten, and the other Epics keep theirs

#### Scenario: Nothing is forgotten while loading
- **WHEN** the user switches to another backlog file and its stories have not loaded yet
- **THEN** the remembered state of the previous file is unchanged, and so is that of the new file

#### Scenario: New group starts expanded
- **WHEN** the user gives a story a new Epic "Reporting" while all Epics are collapsed
- **THEN** "Reporting" is expanded and the other Epics stay collapsed

#### Scenario: Add story into a collapsed group
- **WHEN** the group "(No epic)" with its Feature "(No feature)" is collapsed, other groups are in mixed states, and the user adds a story
- **THEN** the new story is visible and selected, only "(No epic)" and "(No feature)" were expanded, and every other group is as it was

#### Scenario: Accept a story into a collapsed feature
- **WHEN** the Feature "Pay" of "Billing" is collapsed, the Feature "Refund" of "Billing" is collapsed, and the user accepts a proposed story whose Epic is "Billing" and Feature is "Pay"
- **THEN** "Billing" and "Pay" are expanded and show the accepted story, and "Refund" is still collapsed

#### Scenario: Edit the epic of the selected story into a collapsed group
- **WHEN** the selected story is moved by the form from "Billing" to the collapsed Epic "Onboarding", Feature "Signup", which is also collapsed
- **THEN** "Onboarding" and "Signup" are expanded and the story is shown, selected

#### Scenario: Proposed tab unchanged
- **WHEN** the user opens the Proposed tab
- **THEN** its story list has no collapse-all buttons, and its groups can still be folded one at a time as before
