## Context

Today `createBacklog` in `planner/portal/server/server.cjs` writes one file, `user-stories.csv`, with content the browser sends (`newBacklogText()`). `initFolders` in `planner/logic/storage/project-folders.cjs` makes only the data folder. The story skills read `review.csv`, `proposals.csv`, the lexicon and the suggestions, and some of their scripts treat a missing file as an error (`read-story-context.mjs` has several `ENOENT` branches, some tolerated and some reported). Motivation is in the proposal.

The column lists live in ES modules (`backlog/model.js`, `review/review.js`, `lexicon/lexicon.js`, `lexicon/lexicon-suggestions.js`), while the server and `project-folders.cjs` are CommonJS. File paths come from `KIND_FILES` in `storage/backlog-paths.cjs`.

## Goals / Non-Goals

**Goals:**
- One definition of the five starting files, used by New and by init.
- The server builds the files, so no caller can create a half-set backlog.
- Header-only files load cleanly in the portal and the skill scripts.

**Non-Goals:**
- Creating `slices/`, the context map or the `.decided` sidecar up front.
- Handling `planner.config.yaml` or `logs/` (init no longer creates `logs/`, and skills find a `.plans/` folder without a config).
- Any copy-from-existing path.

## Decisions

**Content definition in an ES module, written by CommonJS code.** A new pure module `planner/logic/backlog/starting-files.js` exports the list of `{ kind, text }` pairs, built from the existing column constants and the BOM-plus-header form `newBacklogText()` already uses. It reuses the constants rather than copying header strings, so a column change shows up here without a second edit. The server and `project-folders.cjs` load it with a dynamic `import()`, which both can do because their callers are already async or can become async. The alternative, a CommonJS copy of the headers, was rejected because it repeats the column lists.

**One writer for the file set.** A CommonJS function in `storage/` (for example `writeBacklogFiles(dataDir, name, files)`) makes the folder and writes each file by its `KIND_FILES` path with the no-overwrite write the server already has. On any write failure it removes the folder it made and rethrows, the behaviour `createBacklog` has now for one file. `createBacklog` and init both call it. Placing the path building in `backlog-paths.cjs` stays the rule: callers pass a name and a kind.

**The server owns the content.** The create route ignores a `content` field for kind `backlog`. `useBacklog.newBacklog` stops sending `newBacklogText()`. The change is additive for clients: an old client that still sends content gets the full set instead of its one file.

**Init creates a first backlog only when the folder has none.** After the folder exists, init calls `listBacklogs`; if it is empty, it creates `new-backlog` through the same writer. This keeps the existing "never touch what is there" rule and makes a second init a no-op. `initCodeBase` already delegates to `initFolders`, so a code base's `.plans` gets the same behaviour. The reply lists the backlog folder as created or existing.

**What is not created.** `slices/`, `context-map.*`, `review.csv.decided` and `repo.json` stay on-demand because the skills that own them create them, and an empty context map could be mistaken for real content.

## Risks / Trade-offs

- **Header-only files are unverified in every reader.** The proposals file may carry the extra `Benched` column once a proposal is written, and the lexicon and suggestion loaders add missing columns on load. The first task checks each reader against each header-only file, and the starting content for proposals is chosen from what the proposals writer already produces.
- **A new backlog now has more files to keep in step.** Rename moves the whole folder, so it is unaffected. Delete does not exist. Copy and migration skip existing files, so they stay safe.
- **Init now writes a backlog the user did not name.** It is named `new-backlog` and can be renamed in the portal like any other, so the cost is low and it is what makes the skills usable straight away.
- **A skill started outside the project still finds nothing** when the data folder is not a `.plans` folder and no config sits in the current folder. This is unchanged and out of scope.
