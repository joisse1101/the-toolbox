# the-toolbox

Two separate things live here.

- **`viewer/`** is the backlog viewer, for this repo only. The frontend (a React page built with Vite) shows and edits user stories as plain CSV files in a data folder. The local server uses Node built-ins only.
- **`toolkit/`** is a set of Claude skills, commands and rules you install globally and use anywhere, including the four story skills that fill the viewer's data folder (see [Story Skills](wiki/viewer/Story-Skills.md)). The toolkit imports nothing from `viewer/`: see [`toolkit/README.md`](toolkit/README.md).

The docs live in the wiki under `wiki/`. Start at [Home](wiki/Home.md).

## Layout

| Folder | What it is |
| --- | --- |
| `viewer/frontend/` | The React pages, the Vite config and `src/`. Builds into `viewer/frontend/dist/`. |
| `viewer/backend/` | `server.cjs`, which serves `viewer/frontend/dist/` and the CSV file API, and the storage modules only the server uses. |
| `viewer/shared/` | Code that the server, the browser and the story skills share, by domain: CSV parsing, the story model, IDs, reviews, proposals, the lexicon, storage paths. It also holds `guidelines/` (backlog standards, point sizing and diagram conventions, shown in the viewer). The sync script copies it into the story skills. |
| `viewer/data/` | Your private data (git-ignored): one folder per backlog (see [Data Folder](wiki/viewer/architecture/Data-Folder.md), which also covers the project config and the older layout). |
| `viewer/scripts/` | `start.mjs` (build if stale, start the server) and `sync-skill-logic.mjs` (writes the shared code and guidelines into each story skill, see [Story Skills Internals](wiki/viewer/architecture/Story-Skills-Internals.md)). |
| `openspec/` | Specs and change history (must stay at the root for the OpenSpec CLI). |
| `toolkit/` | Reusable Claude skills, slash commands and rules, with an installer, including the story skills. How to install and use it: [`toolkit/README.md`](toolkit/README.md) and the [Toolkit Guide](wiki/toolkit/Toolkit-Guide.md). |
| `viewer/test/` | Tests, in `shared/`, `backend/` and `frontend/`, plus the zone and sync checks. The story skills' own tests are in `toolkit/tests/story/`. |

## Run

```
cd viewer        # package.json and node_modules live here
npm install      # once
npm start        # builds if needed, runs the server, opens http://localhost:3000/
npm start -- --dev   # server + Vite dev server with hot reload (http://localhost:5173/)
```

Options after `--`: `--build` forces a rebuild, `--no-open` skips opening the browser. Set `PORT` to use another port. The server listens on `127.0.0.1` only. Stop everything with Ctrl+C. The backlog portal is the page `/backlog-portal/`.

You can still run the pieces yourself: `npm run build`, `node viewer/backend/server.cjs`, `npm run dev` (needs the server running; it proxies `/api`).

## Quick start

1. Run the viewer as above and press **New** to create a backlog.
2. Copy `viewer/viewer.config.example.yaml` to `viewer/viewer.config.yaml` to name the project or point the viewer at another data folder or a code base. Without it the data folder is `viewer/data/`.
3. Install the toolkit to use the story skills, as described in [`toolkit/README.md`](toolkit/README.md), and start Claude in the code base folder.

## Tests

- `npm test`, from `viewer/`: the backend, the frontend, the shared code, the zone rules and the sync drift test.
- `node --test toolkit/tests/story/*.test.mjs`: the story skills' scripts.
- `python -m pytest` and `python check_toolkit.py`, from `toolkit/`: the toolkit items and installer.

## Where the rest is

Each topic that used to be explained here is on a wiki page.

| Topic | Page |
| --- | --- |
| Project config (`projectName`, `dataDir`, `codeBase`, `VIEWER_CONFIG`) and the Settings tab | [Data Folder](wiki/viewer/architecture/Data-Folder.md), [Viewer Guide](wiki/viewer/Viewer-Guide.md) |
| Data layout, the older layout and migrating it, no backup feature | [Data Folder](wiki/viewer/architecture/Data-Folder.md) |
| The tabs: proposed stories, the review, the lexicon, the graph, story IDs and locks | [Viewer Guide](wiki/viewer/Viewer-Guide.md) |
| Routines such as creating a backlog or accepting proposals | [User Flows](wiki/viewer/User-Flows.md) |
| The four story skills, their commands and how they write | [Story Skills](wiki/viewer/Story-Skills.md) and [Story Skills Internals](wiki/viewer/architecture/Story-Skills-Internals.md) |
| The generated copy and the sync script | [Story Skills Internals](wiki/viewer/architecture/Story-Skills-Internals.md) |
| Adding a new tool to the viewer | [Workflow](wiki/Workflow.md#adding-a-new-tool) |
