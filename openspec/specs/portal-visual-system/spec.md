# portal-visual-system Specification

## Purpose
Gives the planner portal one set of design scales and consistent interaction states, so every tab looks and behaves alike at any window size.

## Requirements

### Requirement: Design scales
The portal's stylesheets SHALL define named values for font size, spacing, radius, shadow, greys and accent shades, and SHALL use those names instead of one-off numbers. Font sizes SHALL be in `px` or `rem`, never `em`. No UI text SHALL be smaller than 12px or lighter than weight 400.

#### Scenario: No one-off sizes
- **WHEN** the stylesheets are searched for `font-size` values
- **THEN** each value is a named scale value, none is below 12px and none uses `em`

#### Scenario: Radius is consistent
- **WHEN** two controls of the same kind appear side by side
- **THEN** they share the same corner radius from the scale

### Requirement: Interaction states
Every clickable element SHALL show a visible hover state and a visible keyboard-focus ring of the same style. A selected row SHALL have a background tint besides any edge mark. A disabled control SHALL look plainly disabled and its text SHALL keep at least 4.5:1 contrast with its fill. A disabled control SHALL NOT react to hover.

#### Scenario: Selected row
- **WHEN** a row of the Stories table is ticked
- **THEN** the row has a tinted background

#### Scenario: Disabled control
- **WHEN** the pointer is over a disabled button
- **THEN** the button does not change its border or fill

### Requirement: Sort indicator
A sortable table header SHALL show a sort arrow only on the column currently sorted, with the direction, and SHALL expose the sort state to assistive technology.

#### Scenario: One arrow
- **WHEN** the Stories table is sorted by Epic
- **THEN** only the Epic header shows an arrow and the other headers show none

### Requirement: Readable table columns
The Stories table SHALL size the ID column to fit the longest ID, SHALL NOT clip a column header's text, and SHALL give the Title column the spare width.

#### Scenario: Long IDs
- **WHEN** the table shows an ID such as `B1-IAM-0002` at a window width of 900px
- **THEN** the whole ID and every header label are readable

### Requirement: Responsive shell
At a window width of 390px the page SHALL NOT scroll sideways. The tab bar SHALL scroll within its own box instead of widening the page, and related controls SHALL wrap together as a group. At widths above 1400px the content SHALL be centred with a maximum width.

#### Scenario: Phone width
- **WHEN** the portal opens at 390px wide
- **THEN** the page width equals the window width and every tab can be reached by scrolling the tab bar

#### Scenario: Wide screen
- **WHEN** the portal opens at 1920px wide
- **THEN** the content is centred and no wider than the maximum

### Requirement: Graph fit and text size
The Graph tab SHALL fit the graph to its canvas when it first shows and whenever the canvas changes size. It SHALL NOT enlarge a small graph beyond 150%, and SHALL NOT shrink node text below 11px; a graph too large to fit at that size SHALL scroll or pan.

#### Scenario: Window resized
- **WHEN** the window changes from 1440px to 900px wide with the Graph tab open
- **THEN** every node is inside the canvas or reachable by panning, with none cut off

#### Scenario: Small graph
- **WHEN** the backlog has four connected stories
- **THEN** the graph is not drawn larger than 150%
