# the-toolbox

Two separate things live here.

- **`planner/`** is the backlog planner, for this repo only. The portal (a React page built with Vite) shows and edits user stories as plain CSV files in a data folder. The local server uses Node built-ins only.
- **`toolkit/`** is a set of Claude skills, commands and rules you install globally and use anywhere, including the four story skills that fill the planner's data folder (see [Story Skills](wiki/planner/Story-Skills.md)). The toolkit imports nothing from `planner/`: see [`toolkit/README.md`](toolkit/README.md).

The docs live in the wiki under `wiki/`. Start at [Home](wiki/Home.md).

## Layout

| Folder | What it is |
| --- | --- |
| `planner/portal/web/` | The React pages and the Vite config. Builds into `planner/portal/dist/`. |
| `planner/portal/server/` | `server.cjs`: serves `planner/portal/dist/` and the CSV file API. |
| `planner/logic/` | Pure logic with no UI or server, by domain: CSV parsing, the story model, IDs, reviews, proposals, the lexicon, storage paths. Used by the portal and copied into the story skills by the sync script. |
| `planner/data/` | Your private data (git-ignored): one folder per backlog (see [Data Folder](wiki/planner/architecture/Data-Folder.md), which also covers the project config and the older layout). |
| `planner/guidelines/` | Backlog standards, point sizing and diagram conventions, shown in the portal and copied into the story skills. |
| `planner/scripts/` | `sync-skill-logic.mjs`: writes the shared logic and guidelines into each story skill (see [Story Skills Internals](wiki/planner/architecture/Story-Skills-Internals.md)). |
| `openspec/` | Specs and change history (must stay at the root for the OpenSpec CLI). |
| `toolkit/` | Reusable Claude skills, slash commands and rules, with an installer, including the story skills. How to install and use it: [`toolkit/README.md`](toolkit/README.md) and the [Toolkit Guide](wiki/toolkit/Toolkit-Guide.md). |
| `planner/test/` | Tests, in `logic/` and `portal/`, plus the zone and sync checks. The story skills' own tests are in `toolkit/tests/story/`. |

## Run

```
cd planner       # package.json and node_modules live here
npm install      # once
npm start        # builds if needed, runs the server, opens http://localhost:3000/
npm start -- --dev   # server + Vite dev server with hot reload (http://localhost:5173/)
```

Options after `--`: `--build` forces a rebuild, `--no-open` skips opening the browser. Set `PORT` to use another port. The server listens on `127.0.0.1` only. Stop everything with Ctrl+C. The backlog portal is the page `/backlog-portal/`.

You can still run the pieces yourself: `npm run build`, `node planner/portal/server/server.cjs`, `npm run dev` (needs the server running; it proxies `/api`).

## Quick start

1. Run the portal as above and press **New** to create a backlog.
2. Copy `planner/planner.config.example.yaml` to `planner/planner.config.yaml` to name the project or point the planner at another data folder or a code base. Without it the data folder is `planner/data/`.
3. Install the toolkit to use the story skills, as described in [`toolkit/README.md`](toolkit/README.md), and start Claude in the code base folder.

## Tests

- `npm test`, from `planner/`: the portal, the logic, the zone rules and the sync drift test.
- `node --test toolkit/tests/story/*.test.mjs`: the story skills' scripts.
- `python -m pytest` and `python check_toolkit.py`, from `toolkit/`: the toolkit items and installer.

## Where the rest is

Each topic that used to be explained here is on a wiki page.

| Topic | Page |
| --- | --- |
| Project config (`projectName`, `dataDir`, `codeBase`, `PLANNER_CONFIG`) and the Settings tab | [Data Folder](wiki/planner/architecture/Data-Folder.md), [Planner Guide](wiki/planner/Planner-Guide.md) |
| Data layout, the older layout and migrating it, no backup feature | [Data Folder](wiki/planner/architecture/Data-Folder.md) |
| The tabs: proposed stories, the review, the lexicon, the graph, story IDs and locks | [Planner Guide](wiki/planner/Planner-Guide.md) |
| Routines such as creating a backlog or accepting proposals | [User Flows](wiki/planner/User-Flows.md) |
| The four story skills, their commands and how they write | [Story Skills](wiki/planner/Story-Skills.md) and [Story Skills Internals](wiki/planner/architecture/Story-Skills-Internals.md) |
| The generated copy and the sync script | [Story Skills Internals](wiki/planner/architecture/Story-Skills-Internals.md) |
| Adding a new tool to the portal | [Workflow](wiki/Workflow.md#adding-a-new-tool) |
