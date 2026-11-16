# viewer-navigation Specification

## Purpose

Gives every viewer tool and tab its own address, so a reload, the back button or a bookmark returns the user to the same place inside the one-page app.

## Requirements

### Requirement: Each tool and tab has an address
The viewer SHALL show its home page at `/` and its backlog tool at `/backlog`. Each backlog tab SHALL have the address `/backlog/<tab>`, where `<tab>` is `editor`, `stories`, `graph`, `proposed`, `lexicon`, `review` or `settings`. `/backlog` SHALL show the Editor tab and change the address to `/backlog/editor`.

#### Scenario: Open a tab by address
- **WHEN** the user opens `/backlog/graph` with a backlog open
- **THEN** the Graph tab is shown and selected

#### Scenario: Tool address without a tab
- **WHEN** the user opens `/backlog`
- **THEN** the Editor tab is shown and the address becomes `/backlog/editor`

#### Scenario: Home lists the tools
- **WHEN** the user opens `/`
- **THEN** the home page lists the backlog tool, and choosing it opens `/backlog`

### Requirement: The address follows the chosen tab
Choosing a tab, by mouse or keyboard, SHALL change the address to that tab's address and add a history entry. Back and forward SHALL move between the tabs visited, and a reload SHALL show the tab in the address.

#### Scenario: Choose a tab
- **WHEN** the user is on `/backlog/editor` and chooses the Stories tab
- **THEN** the address becomes `/backlog/stories`

#### Scenario: Back returns to the previous tab
- **WHEN** the user goes from Editor to Graph and then presses Back
- **THEN** the Editor tab is shown and the address is `/backlog/editor`

#### Scenario: Reload keeps the tab
- **WHEN** the user reloads on `/backlog/lexicon`
- **THEN** the Lexicon tab is shown after the reload

### Requirement: An unavailable tab falls back
When the address names a tab that cannot be shown, the viewer SHALL replace the address, without adding a history entry, with the tab it shows instead. With no backlog open, every backlog tab SHALL fall back to `settings`. With a backlog that has no review file, `review` SHALL fall back to `editor`.

#### Scenario: No backlog open
- **WHEN** the user opens `/backlog/stories` and no backlog exists in the data folder
- **THEN** the Settings tab is shown and the address is `/backlog/settings`

#### Scenario: Review file gone
- **WHEN** the user is on `/backlog/review` and the review file goes away
- **THEN** the Editor tab is shown and the address is `/backlog/editor`

### Requirement: Unknown addresses show the app's Not Found page
An address that matches no tool or tab SHALL show the viewer's own Not Found page, in the app's style, with a link to the home page. The address `/backlog-portal/` used before this change SHALL redirect to `/backlog`.

#### Scenario: Unknown tab
- **WHEN** the user opens `/backlog/nonsense`
- **THEN** the Not Found page is shown with a link to `/`

#### Scenario: Unknown tool
- **WHEN** the user opens `/reports`
- **THEN** the Not Found page is shown

#### Scenario: Old portal address
- **WHEN** the user opens `/backlog-portal/`
- **THEN** the address becomes `/backlog` and the backlog tool is shown

### Requirement: The server serves the app for every page address
For a GET or HEAD request, the server SHALL send `index.html` when the path is not under `/api/`, names no built file, and its last segment has no file extension. It SHALL answer 404 for an unknown `/api/` route and for a missing path whose last segment has a file extension.

#### Scenario: Reload on a tab address
- **WHEN** the browser requests `/backlog/graph`
- **THEN** the server answers 200 with `index.html`

#### Scenario: Missing asset
- **WHEN** the browser requests `/assets/missing.js`
- **THEN** the server answers 404

#### Scenario: Unknown API route
- **WHEN** the browser requests `/api/nothing`
- **THEN** the server answers 404 and does not send `index.html`
