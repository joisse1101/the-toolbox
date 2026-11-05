# Portal

The portal is the planner's server and web app. It shows and edits the backlog files in the data folder (see [Data Folder](Data-Folder.md)), and the story skills write suggestions, proposals and lexicon terms into the same files. The two meet only in those files.

## The server

`planner/portal/server/server.cjs` uses only Node built-ins (no Express). It serves `planner/portal/dist/` and a small CSV file API.

### File API

`STORES` at the top of the file is an allow-list of the five kinds defined in `planner/logic/storage/backlog-paths.cjs`:

- `backlog`
- `review` (review suggestions)
- `proposals` (proposed stories not yet in the backlog)
- `lexicon` (the backlog's defined terms)
- `lexicon-suggestions` (suggested term renames, deletes and edits)

The API is `/api/<kind>/<backlog name>`. The name carries no `.csv`, and the server resolves it to the kind's fixed file in the backlog's folder under the current data folder. `list` returns the backlog folders, create makes the folder with an empty `user-stories.csv` (numbered on a name conflict) and rename renames the folder. Slices, `logs` and everything else are not kinds, so the file API cannot reach them.

### Settings routes

The settings routes are handled before the store lookup:

- `GET /api/project` answers the name, the served data folder and the config path.
- `PUT /api/project` takes `{projectName?, dataDir?, codeBase?}` and saves the config through `saveConfig`. For a `dataDir` or `codeBase` it also switches the served folder at once. A code base is served as `<codeBase>/.plans`, confined by `confineCodeBase`, which has no `planner/data/` exception. The route is refused with `busy` (409) while a write, create, rename, init, copy or migration is running, and with `refused` (400) when `confineDir` or `saveConfig` refuses.
- `POST /api/project/check` takes `{dir}` or `{codeBase}` and answers `refused`, `has-planner-files` (a backlog folder), `older-layout` (no backlog folder but a folder of the older layout), `empty` or `missing`.
- `POST /api/project/init` and `POST /api/project/copy` take `{dir}` or `{codeBase}`. Init of a code base creates only `.plans`, confined first. Copy goes from the served folder and never overwrites.
- `POST /api/project/migrate` takes no body and needs the same-origin header. It runs `migrateOlderLayout` on the served folder and answers the copied and skipped lists. It never runs unasked.
- `POST /api/project/pick` takes no body. It opens the system folder dialog and answers `{dir}` or `{cancelled: true}`, or 500 `picker-unavailable` when the dialog cannot open. It saves and switches nothing, and tests replace the dialog through `setFolderDialog`.

Like every route, these answer only a loopback Host. A bad config ends the server at startup, naming the key.

## The web app

`planner/portal/web/` is a multi-page Vite build. The pages are listed in `build.rollupOptions.input` in `planner/portal/web/vite.config.mjs`, and `planner/portal/web/main.jsx` is the landing page. It imports logic from `planner/logic/` by relative path.

`planner/portal/web/shared/files.js` is the API client. `createFileStore(kind)` gives `list`, `read`, `create`, `write`, `rename` and `openFolder`, with the backlog named without `.csv`. `planner/portal/web/shared/style.css` holds the common styles.

### The backlog portal

`planner/portal/web/backlog-portal/` is the only tool so far. These parts are worth knowing:

- `planner/portal/web/backlog-portal/graph.js` lays out the dependency graph for the Graph tab. `groupStories` folds the stories into features or epics for the Features and Epics levels, which are read-only and reuse `layoutGraph`.
- `planner/portal/web/backlog-portal/hooks/useBacklog.js` holds the reducer state, and `planner/portal/web/backlog-portal/hooks/useAutosave.js` saves after a delay and retries on failure, for example when the file is locked in Excel.
- `planner/portal/web/backlog-portal/components/` holds the tabs.

### Panel sizes

`planner/portal/web/backlog-portal/hooks/usePanelSizes.js` keeps the widths of the draggable list divider on the Editor, Proposed and Lexicon tabs (through `planner/portal/web/backlog-portal/hooks/useListWidth.js`) and of the Stories table columns. They are kept in `localStorage` under `planner.listWidth.<tab>` and `planner.colWidth.<column>`. `planner/portal/web/backlog-portal/components/ResizeHandle.jsx` is the drag handle, and a double-click resets it. The limits are in `planner/portal/web/lib/panel-size.js`.

### Folded epics and features

`planner/portal/web/backlog-portal/hooks/useCollapsed.js` keeps the Editor's folded epics and features. Closed keys are named by epic or feature name, kept in `localStorage` under `planner.collapsed.<backlog>`, and pruned once the backlog is loaded. The rules are in `planner/portal/web/lib/collapse.js`.

`App` holds this hook, calls `reveal` when a story is added, accepted or given another Epic or Feature, and passes it to `StoryList` as the opt-in `collapse` prop. That prop also shows the Collapse and Expand buttons. The Proposed tab's list keeps its own folds, which are not stored.

### Locking a group

With the opt-in `onLockGroup` prop, each Epic and Feature head also has a lock button. It locks or unlocks the stories of that group through `lockGroup` in `useBacklog`, and `groupLockState` in `planner/logic/backlog/ids.js` gives the head's mark. Nothing about the group is stored, so a story added later is unlocked. The Proposed tab's list has no lock button.

### Settings tab

`planner/portal/web/backlog-portal/components/SettingsTab.jsx` works with `planner/portal/web/backlog-portal/hooks/useSettings.js` and handles the project name and the data folder.

- The data folder box is read-only. Change folder opens the system folder dialog through `POST /api/project/pick`, which the server opens because a browser cannot return a full path.
- The chosen folder goes through check, an offer and a live switch through the settings routes. The offer is to create the data folder, or to copy the data into a new folder.
- Change code base uses the same dialog. The data folder becomes `<code base>/.plans`, with an offer to move a `dataDir` setup's data into it by copy, never overwriting. Declining changes nothing.
- A Migrate action shows when the folder holds the older layout.

Skill sessions use the new folder once they are restarted. The FileBar shows a notice when the data folder holds the older layout.

### Lexicon tab

`planner/portal/web/backlog-portal/components/LexiconTab.jsx` works with `planner/portal/web/backlog-portal/hooks/useLexicon.js`, which reuses `useAutosave` through its `serialize` option. An existing term saves when a field is left, and a refused change stays on screen with the reason.

## Adding a tool

The steps to add a new tool are in [Workflow](../../Workflow.md).
