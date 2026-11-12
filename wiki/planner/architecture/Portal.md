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

The API is `/api/<kind>/<backlog name>`. The name carries no `.csv`, and the server resolves it to the kind's fixed file in the backlog's folder under the current data folder. `list` returns the backlog folders, create makes the folder with the five empty starting files and a `backlog.json` holding the default initials (numbered on a name conflict; the folder is removed if `backlog.json` cannot be written) and rename renames the folder, so the initials stay. A read of kind `backlog` also returns `initials`, and a backlog without `backlog.json` is given the default, which is saved on that first read. `PATCH /api/backlog/files/<name>` with `{ "initials": "OPS" }` changes the initials: the value is validated (`400` with the rule when invalid), uppercased and refused with `409` (`initials-taken`) when a sibling backlog uses it or holds a frozen ID that starts with it, and the message names that sibling. The check covers the data folder being served only. The rules and the file are described in [Data Folder](Data-Folder.md). Slices, `logs` and everything else are not kinds, so the file API cannot reach them.

### Settings routes

The settings routes are handled before the store lookup:

- `GET /api/project` answers the name, the served data folder, the config path, `projects` (each with an `exists` flag) and `activeProject`.
- `PUT /api/project` takes `{projectName?, dataDir?, codeBase?}` and saves the config through `saveConfig`. For a `dataDir` or `codeBase` it also switches the served folder at once. A code base is served as `<codeBase>/.plans`, confined by `confineCodeBase`, which has no `planner/data/` exception. The route is refused with `busy` (409) while a write, create, rename, init, copy or migration is running, and with `refused` (400) when `confineDir` or `saveConfig` refuses.
- `POST /api/project/check` takes `{dir}` or `{codeBase}` and answers `refused`, `has-planner-files` (a backlog folder), `older-layout` (no backlog folder but a folder of the older layout), `empty` or `missing`.
- `POST /api/project/init` and `POST /api/project/copy` take `{dir}` or `{codeBase}`. Init of a code base creates only `.plans`, confined first. Copy goes from the served folder and never overwrites.
- `POST /api/project/add` takes `{codeBase, name?, init?}` or `{newName}`. It links a code base or creates `planner/data/<name>`, appends the entry and switches. A project already listed is switched to, not added twice. A code base without planner files answers `needsInit` until it is called again with `init: true`.
- `POST /api/project/relocate-plan` takes `{dir}` or `{codeBase}` and is read-only. It answers `status`, `action` (`copy`, `choose` or `switch`), `needsChoice` and `exists`, the files an overwrite would replace.
- `POST /api/project/relocate-apply` takes the same target plus `choice`, one of `overwrite`, `switch` or `cancel`. It plans, copies, reads back and only then calls `replaceActive`, in that order. Any failure answers `copy-failed`, `copy-stopped`, `refused` or `choice-needed` with the config unchanged, and a target that is another saved project answers `exists`. The old folder is never touched.
- `POST /api/project/migrate` takes no body and needs the same-origin header. It runs `migrateOlderLayout` on the served folder and answers the copied and skipped lists. It never runs unasked.
- `POST /api/project/pick` takes no body. It opens the system folder dialog and answers `{dir}` or `{cancelled: true}`, or 500 `picker-unavailable` when the dialog cannot open. It saves and switches nothing, and tests replace the dialog through `setFolderDialog`.

Like every route, these answer only a loopback Host. A bad config ends the server at startup, naming the key.

## The web app

`planner/portal/web/` is a multi-page Vite build. The pages are listed in `build.rollupOptions.input` in `planner/portal/web/vite.config.mjs`, and `planner/portal/web/main.jsx` is the landing page. It imports logic from `planner/logic/` by relative path.

`planner/portal/web/shared/files.js` is the API client. `createFileStore(kind)` gives `list`, `read`, `create`, `write`, `rename` and `openFolder`, with the backlog named without `.csv`. `planner/portal/web/shared/style.css` holds the common styles.

### Design scales

`planner/portal/web/shared/style.css` defines the design scales as CSS variables in `:root`, so the landing page and the portal share them. `planner/portal/web/backlog-portal/tool.css` uses the names and holds no one-off font size.

- Type: `--text-xs` 12px, `--text-sm` 14px, `--text-md` 16px, `--text-lg` 20px, `--text-xl` 24px. Sizes are in `px`, never `em`, and no text is below 12px or lighter than weight 400.
- Spacing: `--space-1` to `--space-6`, which are 4, 8, 12, 16, 24 and 32px.
- Radius: `--radius-sm`, `--radius-md` and `--radius-full`. The older `--radius` is the medium one.
- Shadow: `--shadow-1` to `--shadow-4`.
- Colour: a grey ramp `--grey-50` to `--grey-900` and an accent ramp `--accent-100` to `--accent-900` (five shades). The named colours (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent` and the warning and error ones) keep their names and pick from the ramps; the dark theme overrides them in a `prefers-color-scheme` block.
- States: `--accent-tint` is the selected-row background, `--hover-bg` the hover fill, `--disabled-bg`, `--disabled-text` and `--disabled-border` the disabled look (flat grey, no opacity, no hover change), and `--focus-ring` the one focus ring every control uses.
- Layout: `--page-max` (1600px) is the widest the content grows; above it the page is centred.

Text, muted, placeholder and disabled colours keep at least 4.5:1 contrast with their fill in both themes. The Graph tab fits the graph to its canvas on first show and on every canvas resize, never below the zoom that keeps node text at 11px and never above 100%, and a graph too large for that is panned.

### The backlog portal

`planner/portal/web/backlog-portal/` is the only tool so far. These parts are worth knowing:

- `planner/portal/web/backlog-portal/graph.js` lays out the dependency graph for the Graph tab. `groupStories` folds the stories into features or epics for the Features and Epics levels, which are read-only and reuse `layoutGraph`.
- `planner/portal/web/backlog-portal/hooks/useBacklog.js` holds the reducer state, and `planner/portal/web/backlog-portal/hooks/useAutosave.js` saves after a delay and retries on failure, for example when the file is locked in Excel.
- `planner/portal/web/backlog-portal/components/` holds the tabs.

### Panel sizes

`planner/portal/web/backlog-portal/hooks/usePanelSizes.js` keeps the widths of the draggable list divider on the Editor, Proposed and Lexicon tabs (through `planner/portal/web/backlog-portal/hooks/useListWidth.js`) and of the Stories table's Epic, Feature and Title columns (the ID, Points, Priority and Depends On columns have a fixed width, and Title takes the spare width). They are kept in `localStorage` under `planner.listWidth.<tab>` and `planner.colWidth.<column>`. `planner/portal/web/backlog-portal/components/ResizeHandle.jsx` is the drag handle, and a double-click resets it. The limits are in `planner/portal/web/lib/panel-size.js`.

### Folded epics and features

`planner/portal/web/backlog-portal/hooks/useCollapsed.js` keeps the Editor's folded epics and features. Closed keys are named by epic or feature name, kept in `localStorage` under `planner.collapsed.<backlog>`, and pruned once the backlog is loaded. The rules are in `planner/portal/web/lib/collapse.js`.

`App` holds this hook, calls `reveal` when a story is added, accepted or given another Epic or Feature, and passes it to `StoryList` as the opt-in `collapse` prop. That prop also shows the Collapse and Expand buttons. The Proposed tab's list keeps its own folds, which are not stored.

### Locking a group

With the opt-in `onLockGroup` prop, each Epic and Feature head also has a lock button. It locks or unlocks the stories of that group through `lockGroup` in `useBacklog`, and `groupLockState` in `planner/logic/backlog/ids.js` gives the head's mark. Nothing about the group is stored, so a story added later is unlocked. The Proposed tab's list has no lock button.

### Settings tab

`planner/portal/web/backlog-portal/components/SettingsTab.jsx` works with `planner/portal/web/backlog-portal/hooks/useSettings.js` and handles the project name and the data folder.

- The data folder box is read-only. Change folder opens the system folder dialog through `POST /api/project/pick`, which the server opens because a browser cannot return a full path.
- The chosen folder relocates the current project through `relocate-plan` and `relocate-apply`. An empty or missing target is copied to without a prompt. A target with backlog folders shows the files an overwrite would replace and asks Overwrite, Just switch or Cancel. The new path is saved only after the read-back, so a failed copy shows its reason and changes nothing.
- Change code base is the same flow on `<code base>/.plans`, and Move data into a code base is the same button for a `dataDir` setup.
- Run init remains, and a Migrate action shows when the folder holds the older layout.

### Project dropdown

`planner/portal/web/backlog-portal/components/FileBar.jsx` has a Project dropdown left of the Backlog dropdown, with `planner/portal/web/backlog-portal/hooks/useProjects.js` and `planner/portal/web/backlog-portal/components/AddProjectDialog.jsx`. Add Project comes first and the saved projects follow, with a missing folder disabled. Choosing one settles pending saves and reuses the live switch, and no file is touched. The dialog links a code base or creates a project from a name, through `POST /api/project/add`.

Skill sessions use the new folder once they are restarted. The FileBar shows a notice when the data folder holds the older layout.

### Lexicon tab

`planner/portal/web/backlog-portal/components/LexiconTab.jsx` works with `planner/portal/web/backlog-portal/hooks/useLexicon.js`, which reuses `useAutosave` through its `serialize` option. An existing term saves when a field is left, and a refused change stays on screen with the reason.

## Adding a tool

The steps to add a new tool are in [Workflow](../../Workflow.md).
