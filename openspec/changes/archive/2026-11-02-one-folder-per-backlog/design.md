# Design

Goal: one self-contained folder per backlog, with no change to CSV formats, story IDs or lexicon rules.

## Context

Known from the code and from #49 (`configure-project-and-data-dir`, archived before this starts):

- The data directory holds one folder per kind of file, with one file per backlog in each.
- A backlog is identified by its file name, such as `iam.csv`.
- The server's `STORES` allow-list maps a store name to a folder, and only `.csv` files directly inside a store are reachable.
- Diagrams are already one folder per backlog.
- A YAML project config holds `projectName` and `dataDir`, read through `paths.cjs`. Init, copy and a live switch of the data directory exist and never overwrite.
- Story IDs, lexicon links and the tools' story references live inside files and are not affected.

## Layout

```
<dataDir>/
  iam/
    user-stories.csv
    user-stories/
      review.csv   review.csv.decided
      proposals.csv
    lexicon.csv
    lexicon/
      lexicon-suggestions.csv
    slices/<slice>/
    repo.json
    context-map.json   context-map.md
  payments/
    ...
  logs/writes.jsonl
```

## Decisions

Decided by the user:
- **Split from #49**, because this change reshapes every path while #49 only changes where the data folder comes from.
- **One folder per backlog.**
- **Builds on #49**: it reuses the config, init, copy and the Settings tab.
- **Backlogs are found under a parent folder.** `dataDir` stays the parent, and a subfolder with `user-stories.csv` is a backlog. The config gains no list.
- **Fixed file names** inside the folder, as the user set them: `user-stories.csv` at the top, the review and proposals in `user-stories/`, the lexicon suggestions in `lexicon/`, the slices in `slices/`. A rename then changes only the folder.
- **Migration is a copy, run on request** from the Settings tab. Nothing is moved or overwritten.
- **Backups are removed**, not moved. The user finds them not useful. The Backup button, the Backups tab, the backup routes, `backup.cjs`, `flatten.js` and `diff-lines.js` go. Backups already on disk are left and ignored, and the migration does not copy them.
- **The context map is kept**, because the user's slices usually touch more than one Epic.

Confirmed by the user after the assistant proposed them:
- **A backlog is named by its folder name**, without `.csv`. A trailing `.csv` is still accepted and dropped, so launchers keep working.
- **The write log stays project level**, at `<dataDir>/logs/`. Its lines name the backlog and kind in place of store and file.
- **One layout only.** The older layout is detected and reported, never read.
- **`repo.json` moves unchanged** to `<backlog>/repo.json`. The context map files sit beside it at `<backlog>/`, not among the slices. Slices go to `<backlog>/slices/<slice>/`.

## Approach

- **One path function first.** A shared module in `planner/logic/storage/` builds every path from a backlog name and a kind of file. Callers switch to it one group at a time.
- **File API keeps its shape.** `STORES` becomes the five kinds (`backlog`, `review`, `proposals`, `lexicon`, `lexicon-suggestions`). The name in a request is the backlog name, and the server resolves it to the fixed file in the backlog folder. `slices` and `logs` stay outside it.
- **Create and rename act on folders.** Create makes the folder with an empty `user-stories.csv`, and rename moves the folder. Both use the numbering and conflict rules of today. `logs` is a reserved name.
- **Backup code is deleted**, with its routes, tab and button. The Settings copy and the migration skip any `backups/` folder.
- **Migration** reads the older layout and copies per backlog with a read-back. It lives with `copyData` in `project-folders.cjs` and is called by a Settings route. Old `diagrams/<name>/<slice>/` goes to `<name>/slices/<slice>/`, and the old `repo.json` and context map go to `<name>/`.
- **Tool servers and scripts** accept the backlog name with or without `.csv`. Tool schemas and descriptions change, and the tool tests check them.

## Risks

- **Every path-building script changes at once.** Mitigation: one path module first, then callers one group at a time, each with its tests.
- **A migration could lose data.** Mitigation: copy only, read back, never touch the old files.
- **The tool schemas change.** Mitigation: launchers and skills change in the same change, and the tool tests check the descriptions.
- **Large scope.** Mitigation: tasks are grouped so the server, the skill scripts and the tool servers are each verified before the next.
- **Hard links and junctions inside a backlog folder.** Unchecked. The file API already resolves the real path, and the plan is to keep that check per backlog.

## Open points

- None. All decisions are made and the context map is kept.
