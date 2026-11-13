# Proposal

## Why

The viewer is built as two separate pages: a launcher, and a backlog portal reached by a plain link. Each new tool would add another page. The open tab lives only in memory, so a reload always drops the user back on the Editor tab, and the back button leaves the app instead of returning to the previous tab. All 40 backlog components also sit in one flat `components/` folder, so it is hard to tell which ones belong to which tab. This change follows `rename-planner-to-viewer` and assumes its layout.

## What Changes

- The frontend becomes a single-page app: one `index.html`, with React Router choosing what to show from the address.
- Addresses:
  - `/` is the home page, which lists the tools (today's launcher).
  - `/backlog` opens the backlog tool on its default tab.
  - `/backlog/<tab>` opens a tab: `editor`, `stories`, `graph`, `proposed`, `lexicon`, `review` or `settings`.
- Choosing a tab changes the address. Reload, back, forward and bookmarks keep the tab.
- An address the app does not know shows the app's own Not Found page, with a link home. The old `/backlog-portal/` address redirects to `/backlog`.
- The server sends `index.html` for any GET address that is not under `/api/` and does not name a file. Unknown `/api/` routes and missing built files still get a 404.
- Frontend code is grouped by tool and feature: `src/app/` holds the router, home and Not Found pages, `src/shared/` holds code that any tool uses, and `src/tools/backlog/` holds the backlog tool, split into `shell/`, `shared/` and `features/` (one folder each for `editor`, `stories`, `graph`, `review`, `proposed`, `lexicon` and `settings`).
- `react-router` is added as a dependency. The second HTML page and the two-page Vite build are removed.

## Capabilities

### New Capabilities

- `viewer-navigation`: addresses for the viewer's tools and tabs, how they follow the user's choices, the Not Found page, and the server's fallback to `index.html`.

### Modified Capabilities

None. Tab order, keyboard behaviour and each tab's content are unchanged (`portal-accessibility`, `portal-safe-actions`).

## Impact

- Code: `viewer/frontend/` (`index.html`, `vite.config.mjs`, `src/`), and the static-file handler in `viewer/backend/server.cjs`. The backlog tool's view state moves from its reducer to the address.
- Dependencies: `react-router` in `viewer/package.json`.
- Tests: new pure tests for the server's fallback rule and for mapping an address to a tool and tab. Pure-module tests move with their modules.
- Docs: the wiki's Portal architecture page and the Viewer Guide describe the addresses and the folder layout. CLAUDE.md drops the second page.
- Users: a bookmark to `/backlog-portal/` keeps working through the redirect.
