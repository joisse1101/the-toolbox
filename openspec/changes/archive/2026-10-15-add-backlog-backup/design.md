## Context

See proposal.md for why. Today `server.cjs` serves only the stores in `STORES` and every `/api/<store>/...` path is resolved through that allow-list, so anything else under `data/` is unreachable. The open backlog is saved by three independent writers: `useAutosave` for the backlog and for the proposals (each with `settle()`, which waits for pending writes and returns false while saving fails), and `useReview`'s own `flush` for the review file. The server runs as CommonJS and cannot `require` the ESM modules in `core/`; the shared pure modules the server needs are `.cjs` (`file-name.cjs`, `paths.cjs`), while `core/csv.js` (`parseCsv`) is ESM. Story IDs are derived and not stable, so there is no key to pair stories across two files.

## Goals / Non-Goals

**Goals:**
- A backup always contains what is on screen at the moment of the press.
- A backup is never partial, and never overwrites an earlier one.
- A comparison shows a changed field as one changed line under its column name, and shows moved stories as moved, without code that pairs stories.

**Non-Goals:**
- Restore, deleting backups, retention, backing up all backlogs at once, a story-aware diff, and pruning the `.csv.decided` sidecar.

## Decisions

**A dedicated route, not a store.** `/api/backup/<file>` is handled in `handleApi` before the store lookup: `POST` creates a backup, `GET` lists them, and `GET /api/backup/<file>/diff?a=<state>&b=<state>` compares. Registering `backups` in `STORES` would make it listable, readable and writable by the file API, which is not wanted; a separate route keeps the allow-list meaning "files the tools edit". The route reuses the `X-Requested-With` check on `POST` and `validateName` for the file name.

**State names are validated, never used as paths.** A state is a backup folder name or the literal `current`. A folder name must match `YYYY-MM-DD_HHMMSS` with an optional `-<n>` suffix, so `..`, separators and absolute paths are rejected before any path is built. The listing only returns names that match the pattern and are folders.

**Pure logic in two `core/` modules.** `core/backup.cjs` (CommonJS, so the server can require it) holds `backupFolderName(date)` (local time), `isBackupFolderName(text)` and `backupFiles(name)` (the `user-stories`, `reviews` and `proposals` entries; never the sidecar). `core/flatten.js` (ESM, next to `csv.js`) holds `flattenCsv(text)`. The server loads the latter with a dynamic `import()`, which works from CommonJS inside an async handler. The copy loop and the git call stay in `server.cjs` because they are I/O. Alternative considered: a CommonJS copy of the CSV parser for the flattening; rejected, because it duplicates `parseCsv`.

**Flatten to one field per line, then let git diff.** `flattenCsv` parses with `parseCsv`, takes the first row as headers, and writes one block per data row: a `---- row N ----` line, then `Header: value` per non-empty cell, with a multi-line value indented on the following lines. Empty cells are omitted so adding a value shows as one added line. Alternatives considered: (1) `git diff` on the raw CSVs, which cuts through multi-line cells and shows no column names; (2) a story-aware diff, which needs a pairing heuristic because IDs are derived and is much more code. The flattened text makes plain git output readable, and `--color-moved` marks reordered blocks.

**Row number in the block header is part of the diff.** Inserting a story renumbers every `---- row N ----` line below it. To avoid that noise the header does not use the row number; it is a constant `----` separator, so unchanged stories below an insertion do not show as changed and git aligns blocks by content. A story is identified in the diff by its own lines (its ID, Epic and User Story lines are in the block).

**git is spawned with an argument array, in a temp folder.** The server writes the two flattened states into a fresh folder from `fs.mkdtemp` under `os.tmpdir()` (one subfolder per state, named by the state, files `user-stories.txt`, `reviews.txt`, `proposals.txt`), runs `git diff --no-index --color=always --color-moved=zebra` with that folder as the working directory and no shell, then deletes the folder in a `finally`. Exit code 1 means "there are differences" and is success; other non-zero codes and spawn errors become an error that says git is needed. Colors are set explicitly with `-c color.diff.*` so the output does not depend on the user's git config. A missing file on one side is written as an empty file, so every row shows as added or removed.

**The tab renders the diff, escaped.** The client turns the ANSI color codes git emits (a handful of fixed ones) into `<span>`s with CSS classes (added, removed, moved), escaping all text first, and never uses `dangerouslySetInnerHTML` on server text. Alternative considered: ask git for plain text and color by the first character; rejected, because moved blocks are only distinguishable by color.

**Atomic-enough backup creation.** The backup folder is created with a non-recursive `mkdir` (the parent `backups/<name>/` is created recursively first). `EEXIST` means the same second was already used, so the next numbered name (`-2`, `-3`, ...) is tried, like `createFile` does for file names. Files are copied with `COPYFILE_EXCL`. If any copy fails, the new folder is removed and the error is mapped by the existing `mapFsError`. A missing review or proposals file (`ENOENT`) is skipped; a missing backlog file is checked first and returns 404 before any folder exists.

**Settle all three writers in the client, before backing up and before comparing with current.** `App.jsx` owns the three hooks, so a shared `settleAll` there waits for the backlog (`autosave.settle()`, exposed through `useBacklog` actions), the proposals (the same on `useProposals`), and the review (a new `settle` on `useReview`). Any failure stops the action with a message. Alternative considered: send the in-memory state to the server; rejected, because the backup then differs from what the skills and Excel see on disk, and a failed save would still produce a "good" backup.

**Client calls live in `shared/files.js`.** `backup`, `listBackups` and `compareBackups` sit next to `createFileStore` and use the same `call` wrapper and `FileApiError`, so locked-file messages come out the same as for saves.

## Risks / Trade-offs

- [A review write fails and is retried in the background, so `settle` could wait indefinitely] → `settle` for the review makes one `flush` attempt and returns false if the rows are still dirty, like the backlog's `settle`.
- [Excel holds a file open, so a backup fails] → the whole backup is refused with the locked message and no partial folder is left; the user closes Excel and presses again.
- [git is not installed or not on the PATH] → only comparing needs it; the tab shows a clear message, and backing up and listing keep working.
- [A reworded story shows as removed plus added] → accepted; pairing by text is the story-aware diff, left for later if needed.
- [Large diffs make the tab slow] → the data is small text; if it ever matters, cap the displayed lines with a "show all" control.
- [Backups grow without limit] → accepted for now; retention is out of scope.
- [Renaming a backlog splits its backups across two folders] → accepted; the folder name is the file name at backup time.
- [No automated test covers the routes or the git call] → the repo tests only pure modules; the routes are checked by hand against a temporary `TLT_DATA_DIR` (see tasks).
