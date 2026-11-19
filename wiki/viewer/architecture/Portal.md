# Portal

The portal is the viewer's server and web app. It shows and edits the backlog files in the data folder (see [Data Folder](Data-Folder.md)), and the story skills write suggestions, proposals and lexicon terms into the same files. The two meet only in those files.

## The server

`viewer/backend/server.ts` uses only Node built-ins (no Express). It serves `viewer/frontend/dist/` and a small CSV file API.

### File API

`STORES` at the top of the file is an allow-list of the five kinds defined in `viewer/shared/storage/backlog-paths.ts`:

- `backlog`
- `review` (review suggestions)
- `proposals` (proposed stories not yet in the backlog)
- `lexicon` (the backlog's defined terms)
- `lexicon-suggestions` (suggested term renames, deletes and edits)

The API is `/api/<kind>/<backlog name>`. The name carries no `.csv`, and the server resolves it to the kind's fixed file in the backlog's folder under the current data folder. `list` returns the backlog folders, create makes the folder with the five empty starting files and a `backlog.json` holding the default initials (numbered on a name conflict; the folder is removed if `backlog.json` cannot be written) and rename renames the folder, so the initials stay. A read of kind `backlog` also returns `initials`, and a backlog without `backlog.json` is given the default, which is saved on that first read. `PATCH /api/backlog/files/<name>` with `{ "initials": "OPS" }` changes the initials: the value is validated (`400` with the rule when invalid), uppercased and refused with `409` (`initials-taken`) when a sibling backlog uses it or holds a frozen ID that starts with it, and the message names that sibling. The check covers the data folder being served only. The rules and the file are described in [Data Folder](Data-Folder.md). A read of `proposals`, `lexicon`, `lexicon-suggestions` or `review` for a backlog whose folder exists but whose file does not answers `200` with empty content, because the browser logs every failed request; the client treats that empty text as no file. A read for a backlog whose folder is missing, and every write to a missing file, still answers `404`. Slices, `logs` and everything else are not kinds, so the file API cannot reach them.

### Settings routes

The settings routes are handled before the store lookup:

- `GET /api/project` answers the name, the served data folder, the config path, `projects` (each with an `exists` flag) and `activeProject`.
- `PUT /api/project` takes `{projectName?, dataDir?, codeBase?}` and saves the config through `saveConfig`. For a `dataDir` or `codeBase` it also switches the served folder at once. A code base is served as `<codeBase>/.plans`, confined by `confineCodeBase`, which has no `viewer/data/` exception. The route is refused with `busy` (409) while a write, create, rename, init, copy or migration is running, and with `refused` (400) when `confineDir` or `saveConfig` refuses.
- `POST /api/project/check` takes `{dir}` or `{codeBase}` and answers `refused`, `has-planner-files` (a backlog folder), `older-layout` (no backlog folder but a folder of the older layout), `empty` or `missing`.
- `POST /api/project/init` and `POST /api/project/copy` take `{dir}` or `{codeBase}`. Init of a code base creates only `.plans`, confined first. Copy goes from the served folder and never overwrites.
- `POST /api/project/add` takes `{codeBase, name?, init?}` or `{newName}`. It links a code base or creates `viewer/data/<name>`, appends the entry and switches. A project already listed is switched to, not added twice. A code base without planner files answers `needsInit` until it is called again with `init: true`.
- `POST /api/project/relocate-plan` takes `{dir}` or `{codeBase}` and is read-only. It answers `status`, `action` (`copy`, `choose` or `switch`), `needsChoice` and `exists`, the files an overwrite would replace.
- `POST /api/project/relocate-apply` takes the same target plus `choice`, one of `overwrite`, `switch` or `cancel`. It plans, copies, reads back and only then calls `replaceActive`, in that order. Any failure answers `copy-failed`, `copy-stopped`, `refused` or `choice-needed` with the config unchanged, and a target that is another saved project answers `exists`. The old folder is never touched.
- `POST /api/project/migrate` takes no body and needs the same-origin header. It runs `migrateOlderLayout` on the served folder and answers the copied and skipped lists. It never runs unasked.
- `POST /api/project/pick` takes no body. It opens the system folder dialog and answers `{dir}` or `{cancelled: true}`, or 500 `picker-unavailable` when the dialog cannot open. It saves and switches nothing, and tests replace the dialog through `setFolderDialog`.

Like every route, these answer only a loopback Host. A bad config ends the server at startup, naming the key.

## The web app

The web app is one page. `viewer/frontend/index.html` is the only HTML entry of the Vite build, and `viewer/frontend/src/main.tsx` mounts React Router 7 there in declarative mode (a `BrowserRouter` around the route list in `viewer/frontend/src/app/routes.tsx`). The app imports logic from `viewer/shared/` by relative path.

### Addresses

Each tool and each tab has its own address, so a bookmark, a reload and the browser's Back and Forward buttons all work. The routes are:

- `/` is the home page (`viewer/frontend/src/app/HomePage.tsx`), which links to each tool.
- `/backlog` redirects to `/backlog/editor`.
- `/backlog/:tab` is the backlog tool (`viewer/frontend/src/tools/backlog/BacklogTool.tsx`). The tabs are `editor`, `stories`, `graph`, `proposed`, `lexicon`, `review` and `settings`, listed in `viewer/frontend/src/tools/backlog/tabs.ts`.
- `/backlog-portal/*` redirects to `/backlog`, so an old bookmark still works.
- Any other address shows the Not Found page (`viewer/frontend/src/app/NotFoundPage.tsx`).

The open tab comes only from the address. `resolveTab` in `viewer/frontend/src/tools/backlog/tabs.ts` turns the address's tab into the tab to show: it gives `settings` when no backlog is open, `editor` in place of `review` when there is no review file, and nothing (the Not Found page) for a name that is not a tab. `useTab` in `viewer/frontend/src/tools/backlog/shell/useTab.ts` waits until the backlog and the review file have been read, so a reload on `/backlog/review` does not fall back before the review file is known. When the resolved tab differs from the address, it replaces the address without adding a history entry, so Back does not return to an address that cannot be shown. Choosing a tab adds a history entry.

### Folder layout

`viewer/frontend/src/` is grouped by tool and by feature:

- `app/` holds the route list, the home page and the Not Found page.
- `shared/` holds what every tool may use: `ui/` (components), `hooks/`, `lib/` (pure logic), `api/` (the file API client) and `style.css`.
- `viewer/frontend/src/tools/backlog/` holds the backlog tool: `BacklogTool.tsx` (the top component), `tabs.ts`, `backlog.css`, `shell/` (header, file bar, tab state, backlog and project state, shortcuts), `shared/` (code several backlog features use, such as `StoryList.tsx` and `story-form/`) and `features/<feature>/` (one folder per tab: `editor`, `stories`, `graph`, `proposed`, `lexicon`, `review`, `settings`).

`viewer/test/zones.test.ts` enforces three import rules inside the frontend:

- Code in `viewer/frontend/src/shared/` imports nothing under `tools/` or `app/`.
- A tool imports no other tool.
- A feature imports no other feature.

Code that two backlog features need goes in `viewer/frontend/src/tools/backlog/shared/`, so a tab can be moved or removed alone. `app/` may import tools, because the routes there mount them.

The server sends `viewer/frontend/dist/index.html` for any path that is not under `/api/` and whose last segment has no file extension, so a reload or a bookmark on `/backlog/graph` loads the app and the router takes over. A path with an extension that has no file in `dist/` answers `404`, so a missing script or style file is not hidden behind the page. `staticTarget` in `viewer/backend/server.ts` makes this choice. The `VIEWER_DIST_DIR` environment variable points the server at another dist folder, which the static-file test uses.

`viewer/frontend/src/shared/api/files.ts` is the API client. `createFileStore(kind)` gives `list`, `read`, `create`, `write`, `rename` and `openFolder`, with the backlog named without `.csv`. `viewer/frontend/src/shared/style.css` holds the common styles.

### Design scales

`viewer/frontend/src/shared/style.css` defines the design scales as CSS variables in `:root`, so the home page and the backlog tool share them. `viewer/frontend/src/tools/backlog/backlog.css` uses the names and holds no one-off font size.

- Type: `--text-xs` 12px, `--text-sm` 14px, `--text-md` 16px, `--text-lg` 20px, `--text-xl` 24px. Sizes are in `px`, never `em`, and no text is below 12px or lighter than weight 400.
- Spacing: `--space-1` to `--space-6`, which are 4, 8, 12, 16, 24 and 32px.
- Radius: `--radius-sm`, `--radius-md` and `--radius-full`. The older `--radius` is the medium one.
- Shadow: `--shadow-1` to `--shadow-4`.
- Colour: a grey ramp `--grey-50` to `--grey-900` and an accent ramp `--accent-100` to `--accent-900` (five shades). The named colours (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent` and the warning and error ones) keep their names and pick from the ramps; the dark theme overrides them in a `prefers-color-scheme` block.
- States: `--accent-tint` is the selected-row background, `--hover-bg` the hover fill, `--disabled-bg`, `--disabled-text` and `--disabled-border` the disabled look (flat grey, no opacity, no hover change), and `--focus-ring` the one focus ring every control uses.
- Layout: `--page-max` (1600px) is the widest the content grows; above it the page is centred.

Text, muted, placeholder and disabled colours keep at least 4.5:1 contrast with their fill in both themes. The Graph tab fits the graph to its canvas on first show and on every canvas resize, never below the zoom that keeps node text at 11px and never above 100%, and a graph too large for that is panned.

### The backlog portal

`viewer/frontend/src/tools/backlog/` is the only tool so far. These parts are worth knowing:

- `viewer/frontend/src/tools/backlog/features/graph/graph.ts` lays out the dependency graph for the Graph tab. `groupStories` folds the stories into features or epics for the Features and Epics levels, which are read-only and reuse `layoutGraph`.
- `viewer/frontend/src/tools/backlog/shell/useBacklog.ts` holds the reducer state, and `viewer/frontend/src/shared/hooks/useAutosave.ts` saves after a delay and retries on failure, for example when the file is locked in Excel.
- `viewer/frontend/src/tools/backlog/features/<feature>/` holds each tab, for example `viewer/frontend/src/tools/backlog/features/editor/EditorTab.tsx`.

### Component layout

The large tabs are split into parts, so no file mixes several jobs. Each parent keeps the state and passes props down. Every path below is under `viewer/frontend/src/tools/backlog/` unless it says otherwise.

- `viewer/frontend/src/tools/backlog/features/graph/GraphTab.tsx` composes `GraphToolbar.tsx`, `GraphCanvas.tsx` (with `graphGeometry.ts`), `GraphDetail.tsx` and `GraphUnlinked.tsx` in the same folder.
- `viewer/frontend/src/tools/backlog/shared/story-form/StoryForm.tsx` composes `StoryHeader.tsx` and the sections `StoryFitSections.tsx`, `EstimateSection.tsx`, `DependenciesSection.tsx`, `CriteriaSection.tsx` and `ClarificationsSection.tsx`, and `storyFormNav.ts` holds the arrow-key navigation between fields. The shared field parts are in `viewer/frontend/src/shared/ui/FormParts.tsx`.
- `viewer/frontend/src/tools/backlog/features/stories/StoriesTab.tsx` composes `StoriesBulkBar.tsx`, `StoriesFilters.tsx` and `StoriesTable.tsx`, with the column list in `storiesColumns.ts`.
- `viewer/frontend/src/shared/ui/Layout.tsx` has the `Stack`, `Row` and `Grid` helpers. Each takes the spacing token (`--space-1` to `--space-6`) as a prop, so a gap is named by the scale and not written as a number.

### Backlog tool hooks and shortcuts

`BacklogTool.tsx` wires the tabs together and leaves the review, proposed and shortcut logic to three hooks:

- `viewer/frontend/src/tools/backlog/features/review/useReviewFlow.ts` wraps `useReview` and adds the suggestion counts, Apply, Dismiss and Accept all. It no longer steps out of the Review tab when the review file goes away: the address fallback in `useTab` does that.
- `viewer/frontend/src/tools/backlog/features/proposed/useProposedFlow.ts` wraps `useProposals` and adds accepting proposed stories and moving a story from the Editor to Proposed. It takes the `useReview` result, because a moved story's open suggestions are dismissed.
- `viewer/frontend/src/tools/backlog/shell/useShortcuts.ts` holds the shortcut table, which drives both the key handler and the Shortcuts popover, and returns the popover rows.

The key handler skips a key when `ignoresKey` in `viewer/frontend/src/tools/backlog/shell/shortcuts.ts` says so. That function is pure, so a Node test covers it (`viewer/test/frontend/shortcuts.test.ts`). It ignores only a plain key (no Ctrl, Alt or Meta) typed in an input, textarea, select or contenteditable element, so typing is never read as a shortcut. Every shortcut uses Ctrl or Alt, so each still works while a field has focus, as the Keyboard shortcuts requirement asks.

### Cues besides colour

`viewer/frontend/src/shared/ui/StateMark.tsx` prints the word and icon ("Incomplete", "Warning") beside every red or yellow row: the Editor list, the Stories table, the story form header, the Graph node and the unlinked list. A required story field that is empty shows "Required" beside its label and carries `aria-invalid`, an empty optional one shows "Not set", a selected Graph node says "Selected", and a failed save shows "Save failed" with a cross. Acceptance criteria have Move up and Move down buttons, and each Editor row has them too, within its feature, as the keyboard alternative to dragging.

### Confirmation dialog

`viewer/frontend/src/shared/ui/ConfirmDialog.tsx` is the one in-page dialog for every delete, clear and discard, built on the native `dialog` element, and `viewer/frontend/src/shared/hooks/useConfirm.ts` opens it and returns the answer as a promise. No code calls the browser's `confirm()`. The dialog names what will go and how many, focuses Cancel first, closes on Escape and returns focus to the button that opened it. A request marked `danger` gets the bold red final button, and the button that opened the dialog stays a plain button. Proposed's Delete selected, Review's Clear all, Lexicon's Delete term, the Stories delete and bulk delete, and the discard of unsaved changes all go through it.

### Tab header, empty state and primary buttons

Every tab starts with `viewer/frontend/src/shared/ui/TabHeader.tsx`: the title on the left and the tab's actions on the right. A tab with nothing to show renders `viewer/frontend/src/shared/ui/EmptyState.tsx` once, with a title, one line of help and, where it applies, one action (Add story on an empty Proposed tab, Clear filters on an empty Stories search). The toolbar that needs rows, such as accept and delete on the Proposed tab, is hidden while the state shows.

Each view has at most one primary-styled button. Per-item buttons repeated down a list, the Apply on a review suggestion and on a lexicon suggestion, are plain buttons.

### Stories bulk bar

The Stories table's bulk bar is quiet until a row is ticked: it has no accent border and no enabled action, then shows the count of ticked rows. It does not repeat the table's filters. A bulk action applies only to the ticked rows that match the current search and filters, chosen by `visibleChecked` in `viewer/frontend/src/tools/backlog/features/stories/story-table.ts`, and when ticked rows are hidden the bar and the confirmation name both the visible and the hidden count.

### Panel sizes

`viewer/frontend/src/shared/hooks/usePanelSizes.ts` keeps the widths of the draggable list divider on the Editor, Proposed and Lexicon tabs (through `viewer/frontend/src/shared/hooks/useListWidth.ts`) and of the Stories table's Epic, Feature and Title columns (the ID, Points and Depends On columns have a fixed width, and Title takes the spare width). They are kept in `localStorage` under `planner.listWidth.<tab>` and `planner.colWidth.<column>`. `viewer/frontend/src/shared/ui/ResizeHandle.tsx` is the drag handle, and a double-click resets it. The limits are in `viewer/frontend/src/shared/lib/panel-size.ts`.

### Folded epics and features

`viewer/frontend/src/shared/hooks/useCollapsed.ts` keeps the Editor's folded epics and features. Closed keys are named by epic or feature name, kept in `localStorage` under `planner.collapsed.<backlog>`, and pruned once the backlog is loaded. The rules are in `viewer/frontend/src/shared/lib/collapse.ts`.

`BacklogTool` holds this hook, calls `reveal` when a story is added, accepted or given another Epic or Feature, and passes it to `StoryList` as the opt-in `collapse` prop. That prop also shows the Collapse and Expand buttons. The Proposed tab's list keeps its own folds, which are not stored.

### Locking a group

With the opt-in `onLockGroup` prop, each Epic and Feature head also has a lock button. It locks or unlocks the stories of that group through `lockGroup` in `useBacklog`, and `groupLockState` in `viewer/shared/backlog/ids.ts` gives the head's mark. Nothing about the group is stored, so a story added later is unlocked. The Proposed tab's list has no lock button.

### Settings tab

`viewer/frontend/src/tools/backlog/features/settings/SettingsTab.tsx` works with `viewer/frontend/src/tools/backlog/features/settings/useSettings.ts` and handles the code base and the data folder (the project name is not edited here: the Project dropdown in the header names the project). Its fields sit under two headings: Project (code base) and Storage (data folder and config file). Each path is a read-only box that stays selectable, so it can be copied, and carries the whole path as its tooltip when the box cuts it short. The explanation of a risky action is a tooltip of its button, shown on hover and on keyboard focus, and Overwrite, the step that replaces files, is the bold red button of the folder offer.

- The data folder box is read-only. Change folder opens the system folder dialog through `POST /api/project/pick`, which the server opens because a browser cannot return a full path.
- The chosen folder relocates the current project through `relocate-plan` and `relocate-apply`. An empty or missing target is copied to without a prompt. A target with backlog folders shows the files an overwrite would replace and asks Overwrite, Just switch or Cancel. The new path is saved only after the read-back, so a failed copy shows its reason and changes nothing.
- Change code base is the same flow on `<code base>/.plans`, and Move data into a code base is the same button for a `dataDir` setup.
- Run init remains, and a Migrate action shows when the folder holds the older layout.

### Project dropdown

`viewer/frontend/src/tools/backlog/shell/FileBar.tsx` has a Project dropdown left of the Backlog dropdown, with `viewer/frontend/src/tools/backlog/shell/useProjects.ts` and `viewer/frontend/src/tools/backlog/shell/AddProjectDialog.tsx`. Add Project comes first and the saved projects follow, with a missing folder disabled. Choosing one settles pending saves and reuses the live switch, and no file is touched. The dialog links a code base or creates a project from a name, through `POST /api/project/add`.

Skill sessions use the new folder once they are restarted. The FileBar shows a notice when the data folder holds the older layout.

### Lexicon tab

`viewer/frontend/src/tools/backlog/features/lexicon/LexiconTab.tsx` works with `viewer/frontend/src/tools/backlog/features/lexicon/useLexicon.ts`, which reuses `useAutosave` through its `serialize` option. An existing term saves when a field is left, and a refused change stays on screen with the reason.

## Adding a tool

The steps to add a new tool are in [Workflow](../../Workflow.md).
