## 1. Pure logic

- [x] 1.1 Add `core/backup.cjs` with `backupFolderName(date)` (local time, `YYYY-MM-DD_HHMMSS`), `isBackupFolderName(text)` (accepts an optional `-<n>` suffix, rejects `..`, separators and other text) and `backupFiles(name)` (the `user-stories`, `reviews` and `proposals` entries for a backlog name, never a `.decided` file), and verify with `test/backup.test.mjs` covering zero-padding, a date at midnight, the exact file list and rejected folder names
- [x] 1.2 Add `core/flatten.js` with `flattenCsv(text)` (one `Header: value` line per non-empty cell, one block per row with a constant `----` separator, multi-line values indented, BOM tolerated, empty text gives empty output), and verify with `test/flatten.test.mjs` covering a multi-line quoted cell, an empty cell being omitted, an inserted row not changing the lines of the rows after it, and a file with only headers

## 2. Backend routes

- [x] 2.1 In `app/backend/server.cjs`, handle `POST /api/backup/<file>` before the store lookup: require the `X-Requested-With` header, validate the name with `validateName`, and return 404 without creating anything when `user-stories/<name>` is missing
- [x] 2.2 Create `DATA_DIR/backups/<name>/<folder>/` with a non-recursive `mkdir`, trying `-2`, `-3`, ... on `EEXIST`, copy each existing file with `COPYFILE_EXCL`, skip `ENOENT` for the review and proposals files, remove the new folder and return the mapped error if a copy fails, and return `{ folder, files }`
- [x] 2.3 Add `GET /api/backup/<file>` returning the backlog's backup folders newest first (only names accepted by `isBackupFolderName` that are folders, each with the files it holds; an empty list when there are none)
- [x] 2.4 Add `GET /api/backup/<file>/diff?a=<state>&b=<state>`: validate both states (a backup folder name that exists, or `current`) and reject `a` equal to `b`, flatten each state's three files (missing file as empty), write them to an `fs.mkdtemp` folder, run `git diff --no-index --color=always --color-moved=zebra` there with an argument array and fixed `-c color.diff.*`, treat exit code 1 as success, delete the temp folder in a `finally`, and return `{ diff }` (empty `diff` means no differences) or an error saying git is needed
- [x] 2.5 Verify by hand against a temporary `TLT_DATA_DIR`: backup with all three files, with the backlog only, with a `.csv.decided` present (not copied), two presses in one second (two folders), a missing backlog (404, no folder), `../x.csv` (rejected), `GET /api/backups/files` (404 unknown store), the list order, and a diff for an edited field, an added row, a reordered row (marked moved), identical states, `a=b`, `a=../x`, backup against `current`, and git missing from the PATH

## 3. Client

- [x] 3.1 Add `backup(name)`, `listBackups(name)` and `compareBackups(name, a, b)` to `app/frontend/shared/files.js` using the existing `call` wrapper, and verify they resolve to the server's `{ folder, files }`, the folder list and `{ diff }`
- [x] 3.2 Add `settle` to `useReview` (one `flush`, resolving false if rows are still dirty) and expose `autosave.settle` through the `useBacklog` and `useProposals` actions, and verify the existing `npm test` suite still passes
- [x] 3.3 In `App.jsx`, add a `settleAll` helper (backlog, proposals, review; a message and a stop on any failure) and a `backup` handler that calls it, then `backup`, and shows "Backed up <name> at HH:MM" (time from the returned folder name) or the error message
- [x] 3.4 Add a Backup button to `FileBar.jsx`, disabled when `current` is null, and verify in the running app that it is disabled with no backlog and enabled with one
- [x] 3.5 Add `BackupsTab.jsx` and a Backups tab in `App.jsx`: the list (newest first, empty-state text), two selectors (backups plus "Current"), a Compare button disabled when both are the same, `settleAll` before a comparison that includes "Current", and the diff panel with a small ANSI-to-span conversion that escapes all text and styles added, removed and moved lines through CSS classes; verify with a unit test of the conversion if it is a pure function, and in the running app otherwise

## 4. Verification and docs

- [x] 4.1 Run `npm run build` and `npm test`, then in the running app check: edit then press Backup at once (backup holds the edit), apply a review suggestion then press Backup (backup holds the status), backlog open in Excel (refused, no partial folder), a new backup appearing in the Backups tab, and comparing two backups and a backup with Current after dragging a story (shown as moved)
- [x] 4.2 Update `CLAUDE.md` (architecture: the backup routes, `core/backup.cjs`, `core/flatten.js`, `data/backups/`, git needed for comparing) and the README tool notes, and verify with a search that no other doc lists the data folders without `backups/`
