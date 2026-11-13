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
backlog.json                        the backlog's initials, not a kind
slices/<slice>/                     not a kind
context-map.json, context-map.md    not a kind
```

Slices, the context map and `backlog.json` are not kinds, so the portal's file API cannot read or write them as files. The server reads and writes `backlog.json` itself.

## Lifecycle of each file

Each file under a backlog folder has one lifecycle: `committed` (belongs in git), `local` (stays on the machine, ignored), `user decides` (untracked until the user commits it) or `removed by archive` (`/jois-code:archive` deletes it once `ARCHIVED.md` holds its summary). The table that gives each path, its writer and its lifecycle is [the plans-files guideline](../../../planner/guidelines/plans-files.md). The same rows are data in `planner/logic/skill-support/plans-files.mjs`, and `planner/test/logic/plans-files-guideline.test.mjs` fails when the two differ.

In short, the backlog's CSVs, `backlog.json`, the context map, `ARCHIVED.md` and `source.json` are committed. The proposals, review files and lexicon suggestions are local. A slice's `UC-<slice>.md` and `tasks.md` are the user's to decide, and its `review.md`, `validation.md` and `validation.partial.md` are local. Archive removes all of those working files.

The `.gitignore` block that matches the table is printed by `toolkit/skills/jois-story-plan/print-gitignore.mjs`, and by each skill's `init-plans.mjs` when it creates `.plans`. It ignores the contents of each folder and re-includes the files that are not `local`, and `planner/test/logic/plans-files-git.test.mjs` checks it against real `git status` on a mock tree. Nothing writes `.gitignore`.

## Initials in backlog.json

`backlog.json` holds one setting, the backlog's initials, written as `{"initials":"B1"}`. The initials start every story ID of the backlog (`B1-IAM-0003`). Valid initials are 1 to 6 letters or digits, start with a letter and have no hyphen, and are stored in uppercase.

A backlog the server creates gets `backlog.json` at once, and a rename moves the folder, so the file and the initials stay with it. A backlog without the file, for example one made before initials existed, is given the default when it is first opened, and the file is saved then. The default is the lowest `B<n>` (n from 1) that does not clash with any sibling backlog.

The initials of one backlog must not clash with a sibling, meaning another backlog in the same data folder. A sibling clashes when it uses the same initials, ignoring case, or when one of its frozen story IDs starts with them and a hyphen. The second case is why initials that a sibling retired are still refused: its frozen IDs keep them. The check cannot see backlogs in another data folder, so two data folders can reuse the same initials.

The server writes the file atomically, to a temporary file first and then a rename, so a failed write never leaves half a file. The functions are in `planner/logic/storage/backlog-initials.cjs`.

## The older layout

The older layout had `backlogs/`, `reviews/`, `proposals/`, `lexicons/`, `lexicon-suggestions/` and `diagrams/`, with one file per backlog in each. A `repo.json` it holds is copied but no longer used. The older layout is only migrated by copy from the Settings tab and is never read as data.

## Storage modules

- `planner/logic/storage/file-name.cjs` has `validateBacklogName`, the one set of backlog-name rules. A trailing `.csv` is dropped. Separators, invalid Windows characters and the reserved name `logs` are refused.
- `planner/logic/storage/backlog-paths.cjs` is the one place that builds the path of a backlog's file from its name and a kind. It has `backlogDir`, `backlogFile`, `reviewDecidedFile`, `slicesDir` and `contextMapFiles`, plus `listBacklogs` and `detectOlderLayout`. `KIND_FILES` registers the kinds, and `PLANS_DIR` names `.plans`.
- `planner/logic/storage/paths.cjs` holds `DATA_DIR`, the folder named by `dataDir` in the project config as read at load, for short-lived scripts. `getDataDir()` and `setDataDir()` are what the server uses, so a switch takes effect at once. `legacyDataHint` says how to move data an earlier layout left in `data/` or `user-stories/`.
- `planner/logic/storage/project-config.cjs` reads, validates and saves `planner/planner.config.yaml`, or the file `PLANNER_CONFIG` names. `loadConfig` returns `projects` (resolved, with `.plans` applied, and a synthetic entry when the active path is not listed or there is no list) and `activeProject` (its index, matched by resolved path). `addProject` appends an entry, and the first add writes the active path into the list. `replaceActive` gives the active entry the new path without a second entry. Both keep the file's comments.
- `planner/logic/storage/project-folders.cjs` holds the folder checks, `initFolders`, `planCopy` and `planCopyToCodeBase` (read-only: the files an overwrite would replace), `copyData` and `migrateOlderLayout` that the Settings tab uses. Init creates only the data folder. Copy skips any `backups/` folder and never overwrites unless the `overwrite` option is set, and then it replaces only files present in both places. It reads each copied or overwritten file back and reports `copied`, `overwritten`, `skipped` and `failed`, plus `stopped` when a file could not be written.

## The project config

The config file is `planner/planner.config.yaml`. It is git-ignored, so copy `planner/planner.config.example.yaml` and edit it. The file `PLANNER_CONFIG` names is read instead when that variable is set. All keys are optional, and a missing file means the defaults.

- `projectName` is shown in the portal header. The default is empty.
- `dataDir` is the folder that holds the data, absolute or relative to the config file's folder. The default is `planner/data/`, which is also used when there is no config file.
- `codeBase` is the folder of a code base you work on, absolute or relative to the config file's folder. The data folder is then `<codeBase>/.plans/`, with the layout above. You never type `.plans`.
- `projects` is an optional list of saved projects, each with one path (`codeBase` or `dataDir`) and an optional `name`. The top-level `codeBase` or `dataDir` stays the active project, so the skills, which read only those two keys from a flat file, need nothing new. Without a list, the active folder shows as one project, and the list is written the first time you add a project. Code older than the list refuses the key as unknown, so delete the list to roll back. `planner/planner.config.example.yaml` shows the shape.

A bad key or value fails naming it, and the server stops at startup with that message. A config with both `codeBase` and `dataDir` fails naming both, because the two keys name the same thing in different ways. `saveConfig` writes one and removes the other in one write, so the file never holds both.

The variables `PLANNER_DATA_DIR` and `TLT_DATA_DIR` are no longer read. If you used one, create `planner/planner.config.yaml` once with `dataDir` set to the same path, then remove the variable.

Committing `.plans/` is the code base owner's choice. Anyone with the code base sees a committed `.plans/`, and it stays in history. The planner never edits `.gitignore`, so add `.plans/` there yourself to keep it private.

## Folder actions

Init creates only the data folder. Copy skips any `backups/` folder. The migration copies the older layout per backlog on request. It never changes or overwrites a file, reads each copy back and reports the files it could not match. It never deletes the old files, so remove the old folders by hand when you are satisfied. The portal shows a notice while the data folder holds the older layout.

There is no backup feature. To keep a copy, copy a backlog's folder or keep the data folder under version control of your own.

## Where skills find the folder

The story skills resolve the folder themselves, as described on [Story Skills Internals](Story-Skills-Internals.md). The portal's server serves the folder that the config names, as described on [Portal](Portal.md).
