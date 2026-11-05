# Data Folder

The data folder holds the backlog files the portal edits and the story skills write. It is private to the user. The default is `planner/data/`, which is git-ignored for that reason. The project config's `dataDir` can name another folder, and its `codeBase` makes it `<codeBase>/.plans/`, which has the same layout. Everything below applies to whichever folder is served.

## Layout

There is one folder per backlog, `<backlog>/`. A folder is a backlog when it holds `user-stories.csv`. Backlogs are named without `.csv` everywhere. `logs` is reserved and cannot be a backlog name, because earlier versions kept a `logs/` folder there.

Inside a backlog folder (paths are relative to that folder, so they are shown as a block and not as repo paths):

```
user-stories.csv                    kind backlog
user-stories/review.csv             kind review (with review.decided beside it)
user-stories/proposals.csv          kind proposals
lexicon.csv                         kind lexicon
lexicon/lexicon-suggestions.csv     kind lexicon-suggestions
slices/<slice>/                     not a kind
context-map.json, context-map.md    not a kind
```

Slices and the context map are not kinds, so the portal's file API cannot reach them.

## The older layout

The older layout had `backlogs/`, `reviews/`, `proposals/`, `lexicons/`, `lexicon-suggestions/` and `diagrams/`, with one file per backlog in each. A `repo.json` it holds is copied but no longer used. The older layout is only migrated by copy from the Settings tab and is never read as data.

## Storage modules

- `planner/logic/storage/file-name.cjs` has `validateBacklogName`, the one set of backlog-name rules. A trailing `.csv` is dropped. Separators, invalid Windows characters and the reserved name `logs` are refused.
- `planner/logic/storage/backlog-paths.cjs` is the one place that builds the path of a backlog's file from its name and a kind. It has `backlogDir`, `backlogFile`, `reviewDecidedFile`, `slicesDir` and `contextMapFiles`, plus `listBacklogs` and `detectOlderLayout`. `KIND_FILES` registers the kinds, and `PLANS_DIR` names `.plans`.
- `planner/logic/storage/paths.cjs` holds `DATA_DIR`, the folder named by `dataDir` in the project config as read at load, for short-lived scripts. `getDataDir()` and `setDataDir()` are what the server uses, so a switch takes effect at once. `legacyDataHint` says how to move data an earlier layout left in `data/` or `user-stories/`.
- `planner/logic/storage/project-config.cjs` reads, validates and saves `planner/planner.config.yaml`, or the file `PLANNER_CONFIG` names.
- `planner/logic/storage/project-folders.cjs` holds the folder checks, `initFolders`, `copyData` and `migrateOlderLayout` that the Settings tab uses.

## The project config

The config holds `projectName`, `dataDir` and `codeBase`. A bad key fails naming it. A `codeBase` makes the data folder `<codeBase>/.plans`. A config with both `codeBase` and `dataDir` fails naming both, and `saveConfig` writes one and removes the other in one write.

## Folder actions

Init creates only the data folder. Copy skips any `backups/` folder. The migration copies the older layout per backlog on request. It never changes or overwrites a file, reads each copy back and reports the files it could not match.

## Where skills find the folder

The story skills resolve the folder themselves, as described on [Story Skills Internals](Story-Skills-Internals.md). The portal's server serves the folder that the config names, as described on [Portal](Portal.md).
