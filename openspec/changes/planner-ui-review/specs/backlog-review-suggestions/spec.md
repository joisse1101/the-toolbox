# Spec Delta

## MODIFIED Requirements

### Requirement: Review tab
The tool SHALL provide a Review tab, shown when the open backlog has a review file, that lists every suggestion of the review in one place: open suggestions grouped by Area (Hierarchy, INVEST, Acceptance criteria) and, within an Area, in backlog order. Each entry SHALL show the story's ID and Title (a link that opens the story in the editor), the Field, the suggested value, the Reason, whether it is a `confirm` default, and Apply and Dismiss with the same behaviour as in the story form. A split group SHALL appear once, under the story it narrows. Entries that are out of date, including those whose story no longer exists, SHALL appear in a separate "Out of date" section with Dismiss only. The tab SHALL show the count of open suggestions, and an empty state when there are none. Applying many suggestions at once is the job of the Accept all buttons, described in "Accept all applies every open suggestion of an area".

#### Scenario: Overview grouped by Area
- **WHEN** a review has suggestions in all three Areas
- **THEN** the Review tab shows three sections, each listing its suggestions with the story they concern

#### Scenario: Apply from the overview
- **WHEN** the user clicks Apply on an entry in the Review tab
- **THEN** the change is made exactly as from the story form and the entry leaves the open list

#### Scenario: Open the story
- **WHEN** the user clicks the story link of an entry
- **THEN** the Editor tab opens on that story

#### Scenario: Out-of-date entries
- **WHEN** a story was renumbered after the review
- **THEN** its entries appear under "Out of date" with Dismiss only

#### Scenario: No review
- **WHEN** the open backlog has no review file or no open suggestions
- **THEN** the Review tab says there is nothing to review
