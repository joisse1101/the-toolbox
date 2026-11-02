# Design (draft)

**Status: DRAFT.** Not ready for specs or tasks. The open questions below change both.

## Context

Known from the code and from the exploration of #49 (`configure-project-and-data-dir`):

- The data folder holds one folder per kind of file, with one file per backlog in each:
  ```
  data/
    backlogs/   iam.csv  payments.csv
    reviews/    iam.csv  iam.csv.decided
    proposals/  iam.csv
    lexicons/   iam.csv
    lexicon-suggestions/  iam.csv
    diagrams/   iam/<slice>/  iam/repo.json  iam/context-map.json
    backups/    iam.csv/<date_time>/...
    logs/       writes.jsonl
  ```
- A backlog is identified by its backlog file name, such as `iam.csv`.
- The server's `STORES` allow-list maps a store name to a folder, and only `.csv` files directly inside a store are reachable.
- Diagrams and backups are already one folder per backlog.
- Story IDs, lexicon links and the tools' story references are not affected: they are inside files.

Known from #49 (decided there, this change builds on it):
- A YAML project config holds `projectName` and `dataDir`, read through `paths.cjs`.
- Init and copy exist and never overwrite.
- The server switches data directory live.
- Settings are a tab in the backlog portal.

## Goals / Non-Goals

**Goals (assumed):**
- A backlog is one folder that can be backed up, shared, moved or deleted as a unit.
- A backlog's folder name is its name.
- Existing data migrates without loss.

**Non-Goals (assumed):**
- Changing the CSV formats, story IDs or lexicon rules.
- Changing what the skills do, only where they read and write.

## Proposed layout (assumed, not confirmed)

```
 <dataDir>/
   iam/
     backlog.csv
     review.csv        review.csv.decided
     proposals.csv
     lexicon.csv
     lexicon-suggestions.csv
     diagrams/<slice>/  repo.json  context-map.json
     backups/<date_time>/...
   payments/
     ...
   logs/writes.jsonl     (project level; see question 4)
```

## Decisions made so far

1. **Split from #49.** Reason: it reshapes every path in the planner, while #49 only changes where the data folder comes from. Alternative rejected by the user: do both in one change.
2. **One folder per backlog**, not one folder per project holding mixed files. Reason given by the user: each backlog should have its own source folder.
3. **Builds on #49.** The config, init, copy and the Settings tab come first, and this change reuses them.

## Open questions

Each one changes the specs or the tasks, so each needs an answer before they are written. Owner: the user. A recommendation is given where the code favours one.

1. **How does the config find the backlogs?**
   - A: `dataDir` is a parent, and every subfolder with a `backlog.csv` is a backlog. Recommended: it matches #49's config and needs no list to keep in sync.
   - B: the config lists each backlog with its own folder path, so backlogs can live anywhere. More flexible, but the config and the Settings tab must manage a list, and the confinement rules of #49 apply per path.
   - This is the question the user has not yet answered.
2. **File names inside the folder.** Fixed names (`backlog.csv`, `review.csv`, ...) as in the layout above, or the backlog's name (`iam/iam.csv`)? Fixed names are recommended: a rename then changes only the folder.
3. **Backlog name.** The folder name, with `.csv` dropped everywhere (MCP tool parameters, API paths, launchers that accept it with or without `.csv`). Recommended, but it changes tool schemas and the portal's rename.
4. **Where do the write log and other project-level files go?** Project level (`<dataDir>/logs/`) is recommended, since the log is about the whole project. Per backlog would split one log into many.
5. **Migration.** Reshape in place, or copy into the new layout and leave the old one? Copy-and-keep is recommended, consistent with #49's copy and no overwrite. When does it run: from the Settings tab on request only, or offered when the old layout is detected?
6. **Support both layouts for a while?** Recommended: no, one migration and one layout, to avoid every script handling two.
7. **Backups.** Inside the backlog folder (`iam/backups/`), so a backup moves with its backlog, or a shared `backups/`? Inside is recommended. A consequence to check: a backup would then sit inside the folder it copies, and the copy must skip it.
8. **Per-backlog target repo.** `repo.json` already sits per backlog. Confirm it moves into the backlog folder unchanged.

## Risks (expected, unchecked)

- [Every path-building script changes at once] → Put path building in one shared function first, then switch the callers.
- [A migration that reshapes files could lose data] → Copy, never move; verify with a read-back; keep the old layout until the user removes it.
- [The MCP tool schemas change] → The launchers and skills that name a backlog are updated in the same change, and the tool tests check the descriptions.
- [Large scope] → Tasks should be grouped so the portal server, the skill scripts and the tool servers can each be verified before the next.
