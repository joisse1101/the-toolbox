# Design

## Context

Issue #49. See proposal.md for the motivation.

- `planner/logic/storage/paths.cjs` reads `PLANNER_DATA_DIR` (and the old `TLT_DATA_DIR`) once, when it loads, and exports `DATA_DIR` as a constant.
- About 15 files take `DATA_DIR` from it: the skill scripts under `.claude/skills/`, `write-log.cjs`, `diagram-tools.mjs` and the server.
- `server.cjs` builds `STORES` and `BACKUPS_DIR` once at startup from that constant.
- Three launchers (`explore-stories.ps1`, `shape-stories.ps1`, `plan-stories.ps1`) repeat the env-var logic in PowerShell.
- `planner/test/setup.mjs` sets `PLANNER_DATA_DIR` to `planner/test/sample-data/`, and `paths.test.mjs` guards that.
- The data folder is grouped by kind of file (`backlogs/`, `reviews/`, ...), one file per backlog in each. That layout does not change here.
- `planner/` has no YAML library yet.

## Goals / Non-Goals

**Goals:**
- One place decides where the data is, and everything asks it.
- A UI change to the data folder takes effect in the server at once.
- A path from the browser can never make the server read or write somewhere unintended.

**Non-Goals:**
- One folder per backlog. See the "Next change" section.
- Making already-running skill scripts and Claude sessions follow a switch.
- Moving the config file itself from the UI.
- Moving data, only copying it.

## Decisions

### 1. The config is a git-ignored file at a fixed place, with one override variable
- The file is `planner/planner.config.yaml`. It cannot live in the data folder, because it names that folder.
- It is git-ignored, since the path differs per machine. A committed `planner.config.example.yaml` shows the keys.
- `PLANNER_CONFIG` names another config file. Tests use it. It is not a data-folder variable.
- Alternative: keep `PLANNER_DATA_DIR` as an override or fallback. Rejected by the user: the config is the single source, so nothing is hidden.
- Alternative: commit the config. Rejected: the data path is per machine.

### 2. A relative `dataDir` is resolved against the config file's folder
- This lets the committed test config say `dataDir: ./sample-data` and work on any machine.
- Default when the file or key is missing: `<repo>/planner/data`. The project name defaults to empty.

### 3. A YAML library, not a hand-written reader
- Use the `yaml` package (supports CommonJS). `paths.cjs` lives in `planner/`, so it finds the package in `planner/node_modules` even when a skill script at the repo root loads it.
- Reason: Windows paths such as `C:\data` and quoted values are easy to mis-parse by hand.
- Saving goes through the library's document API so comments the user wrote in the file survive.
- Alternative: parse two `key: value` lines by hand. Rejected for the quoting risk.

### 4. Validation is strict and names the key
- Allowed keys: `projectName` (string) and `dataDir` (non-empty string). Anything else fails the load, naming the key.
- A YAML syntax error fails the load, naming the file.
- A new key later needs a default, so existing setups keep loading.

### 5. `paths.cjs` stays the single resolution, split into a getter and a constant
- New module `planner/logic/storage/project-config.cjs` holds load, validate, save, init, copy and the folder checks. It is pure Node, no HTTP.
- `paths.cjs` calls it at load and keeps `DATA_DIR` as a constant for the short-lived skill scripts. They start, read the config, do their job and exit, so a constant is right for them.
- `paths.cjs` also exports `getDataDir()` and `setDataDir(dir)`. The server and `write-log.cjs` call `getDataDir()` on every use instead of holding a constant.
- This keeps the ~13 skill scripts unchanged and limits the live-switch change to the server and the write log.
- Alternative: make every consumer call a function. Rejected: far more files for no benefit to short-lived scripts.

### 6. The live switch happens in one step, guarded by a busy counter
- `server.cjs` counts requests that write (file writes, create, rename, backup, init, copy). A switch request is refused with a busy error when the count is not zero.
- When it is zero, the server saves the config, calls `setDataDir`, and rebuilds `STORES` and `BACKUPS_DIR`. This all happens in one turn of the event loop, so no request starts halfway.
- After a switch the browser first settles its pending saves (as the Backup button does), then reloads the page. A full reload avoids the case where the selected backlog does not exist in the new folder.
- Alternative: restart to apply. Rejected by the user in favour of the live switch; the Refresh button is the habit they already have.
- Alternative: switch without the busy check. Rejected: an autosave in flight could land in the old folder.

### 7. The Settings tab is part of the backlog portal and does not need a backlog
- Tabs in `App.jsx` depend on `current`, the selected backlog. An empty new folder has no backlog, which is exactly when Settings is needed.
- So the Settings tab is always shown, and the other tabs keep their behaviour.
- Alternative: a separate settings page. Rejected by the user: settings belong with the data they point at.
- The API client for the settings routes goes in `shared/`, next to `files.js`. The tab's state sits in a `useSettings` hook.
- The project name is shown in the portal header and the page title.

### 8. The change flow checks first, acts, then saves
```
 user types a folder
        |
        v
  POST /api/project/check  --> refused? show the reason, stop
        |
   +----+----------------------+
   | has planner files         | missing or no planner files
   v                           v
 save + switch          offer: [Copy current data]  [Create empty structure]
                               |
                               v
                        run copy or init, then save + switch
```
- The check route returns one of: `refused` (with the reason), `has-planner-files`, `empty`, `missing`.
- "Has planner files" means at least one of the eight folders or one CSV file directly under `backlogs/`.
- The user's choice is the only trigger for a copy or an init.

### 9. Confining a path from the browser
- The server accepts an absolute path only, then resolves links with `realpath` on the folder, or on its nearest existing parent when it is missing.
- It refuses: a drive root, a system folder (Windows: `SystemRoot`, `ProgramFiles`, `ProgramFiles(x86)`, `ProgramData`; elsewhere `/`, `/etc`, `/usr`, `/bin`, `/var`, `/sys`, `/proc`), the user's home folder itself (not folders inside it), a path that is a file, and any path inside the repository other than `planner/data`.
- Allowing only `planner/data` inside the repo is simpler and safer than a deny-list of source folders that could go out of date.
- The server creates a folder only through init or the copy. A plain save never creates one.
- These routes serve only the config file and those created folders. They never read or write file contents elsewhere.
- Alternative: allow any path the user owns. Rejected: a typo or a crafted request could point the store routes at a source or system folder.

### 10. Init and copy never overwrite
- Init creates the eight folders and the data folder itself if missing. It reports created and existing.
- The copy walks the source and creates each file at the same relative path in the target only when it is not there. It skips links and reports copied and skipped.
- A walk is used instead of `fs.cpSync` because the reply must list the skipped files.
- It refuses when the target is the source, inside it, or contains it.
- The copy copies, never moves. The old folder stays as a fallback.
- If a file cannot be read (Excel holds it open), the copy stops and names the file. Files already copied stay, and running it again continues because existing files are skipped.

### 11. Launchers ask `paths.cjs`
- Each launcher runs `node -p "require('<repo>/planner/logic/storage/paths.cjs').DATA_DIR"` and uses the output.
- A config error makes that command exit non-zero. The launcher prints the message and stops, instead of starting a session on the wrong folder.
- This removes three copies of the same logic.

### 12. Tests keep using sample data
- `planner/test/setup.mjs` sets `PLANNER_CONFIG` to a committed `planner/test/sample-config.yaml` whose `dataDir` is `./sample-data`, and no longer sets any data-folder variable.
- `paths.test.mjs`'s guard now checks `PLANNER_CONFIG` is set and the resolved folder is the sample folder.
- Tests that write the config (the settings routes) copy the sample config to a temp folder and point `PLANNER_CONFIG` at the copy.
- Init and copy tests work only in temp folders. No test touches the real `planner/data/` or the real config.

## Risks / Trade-offs

- [A skill script or open Claude session keeps using the old folder after a switch] → The Settings tab says so after a switch. Nothing is lost, since the old folder is intact.
- [The switch lands during a write] → The busy counter refuses it, and the UI tells the user to try again.
- [The copy is large because it includes `backups/`] → The prompt lists what will be copied. The copy is resumable, since it skips existing files.
- [A broken config blocks every script] → The error names the key or the file. Deleting the file restores the default.
- [Existing users lose the env var] → **BREAKING**, listed in the proposal. With no config the default folder is unchanged. A user who relied on the variable creates the config once, and the README shows how.
- [The shell and the server could disagree on a relative `dataDir`] → Both resolve it against the config file's folder, in the same module.

## Migration Plan

1. Merge. With no config file, behaviour is the same as today's default.
2. A user of `PLANNER_DATA_DIR` creates `planner/planner.config.yaml` (or copies the example) with the same path and removes the variable.
3. Rollback: revert the merge. The data folder is never moved or changed by this change, so there is nothing to undo in the data.

## Next change: one folder per backlog

Decided in the exploration of #49, and drafted as its own change, `one-folder-per-backlog`:
- It is deliberately not part of #49.
- It builds on #49's config and copy logic.
- It needs a data migration that reshapes files, not only copies them.

## Open Questions

- Should the example config ship with `projectName` filled in, or empty? Safe either way.
- Should the write log record init and copy actions? Not needed for the specs, and can be added later.
