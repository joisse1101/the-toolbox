## Why

A backlog is edited, reviewed and reshaped by hand, by the review and propose skills, and by bulk actions, all of which rewrite CSV files in place. There is no way to keep a known-good copy to return to, or to see what changed since. One button press that snapshots the open backlog and its related files, and a view that compares two snapshots (or a snapshot and the current state), answers both.

## What Changes

- Add a **Backup** button to the editor's file bar. It is disabled when no backlog is open.
- Pressing it first waits for every pending save of the open backlog (backlog, proposals, review) to reach disk. If saving is failing, no backup is made and a message says why.
- It then asks the server to copy the backlog and its related files into `data/backups/<backlog name>/<YYYY-MM-DD_HHMMSS>/`, keeping the store layout: `user-stories/`, `reviews/`, `proposals/`.
- A missing review or proposals file is skipped, not an error. The `.csv.decided` sidecar is not copied.
- A second press within the same second never overwrites an earlier backup.
- On success the editor shows a banner such as "Backed up sprint-12.csv at 14:32".
- Add a **Backups** tab for the open backlog. It lists that backlog's backups, newest first, and compares two of them, or one of them against the current files.
- The comparison flattens each CSV to one field per line (`Field: value`, one block per row) and runs `git diff --no-index` on the flattened text, so a changed field shows as one changed line under its column name, and a story that was only moved shows as moved. The diff is shown with colors in the tab.
- The folder name, the list of related files, and the flattening are pure functions in `core/`, with tests.

Not in this change: restoring a backup, limiting how many are kept, deleting backups, a story-aware diff that pairs up reworded stories, and pruning the `.csv.decided` sidecar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `csv-file-store`: operations to back up one backlog into a timestamped folder under the data folder (outside the registered stores), list a backlog's backups, and compare two backups or a backup and the current files.
- `user-story-editor`: the Backup button, its disabled state, saving first and the result banner; the Backups tab with the list and the comparison.

## Impact

- `app/backend/server.cjs`: a `/api/backup/<file>` route handled before the store lookup (create, list, and a `diff` sub-path), using the existing `X-Requested-With` check and error mapping, and spawning `git` with an argument array (no shell). `STORES` is unchanged, so the file API still cannot reach `data/backups/`.
- `core/`: new pure modules for the backup folder name and related-file list, and for flattening a CSV to one field per line.
- `app/frontend/shared/files.js`: `backup`, `listBackups` and `compareBackups` client calls.
- `app/frontend/user-story-generator/`: `FileBar.jsx` (button), `App.jsx` (settle all saves, banner, new tab), a new `BackupsTab.jsx`, and a `settle` on the review hook.
- `test/`: tests for the new pure modules.
- New runtime requirement: `git` on the PATH, for the comparison only (a clear message is shown when it is missing). Backing up and listing do not need it.
- `data/backups/` is covered by the existing `data/*` ignore rule.
