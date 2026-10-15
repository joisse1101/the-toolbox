# Team lead tools

Small local tools for a team lead. Each tool is a React page (built with Vite) that keeps its data as plain CSV files in `data/`. The local server itself uses Node built-ins only.

## Layout

| Folder | What it is |
| --- | --- |
| `app/frontend/` | The React pages and the Vite config. Builds into `app/dist/`. |
| `app/backend/` | `server.cjs`: serves `app/dist/` and the CSV file API. |
| `core/` | Pure logic with no UI or server: CSV parsing, the story model, IDs, reviews, proposals. Used by the frontend and by the skill scripts. |
| `data/` | Your private data (git-ignored): `user-stories/`, `reviews/`, `proposals/`, `backups/`. Set `TLT_DATA_DIR` to keep it somewhere else, for example outside the repo. |
| `ai/` | What the AI works from: `guidelines/` (backlog standards, point sizing) and `launchers/` (the `.ps1` session starters). |
| `.claude/skills/` | The skills and their guarded scripts (must stay here for Claude Code to find them). |
| `openspec/` | Specs and change history (must stay at the root for the OpenSpec CLI). |
| `test/` | Tests for `core/` and the skill scripts. |

## Run

```
npm install      # once
npm start        # builds if needed, runs the server, opens http://localhost:3000/
npm start -- --dev   # server + Vite dev server with hot reload (http://localhost:5173/)
```

Options after `--`: `--build` forces a rebuild, `--no-open` skips opening the browser. Set `PORT` to use another port and `TLT_DATA_DIR` to keep the data elsewhere. The server listens on `127.0.0.1` only. Stop everything with Ctrl+C.

You can still run the pieces yourself: `npm run build`, `node app/backend/server.cjs`, `npm run dev` (needs the server running; it proxies `/api`).

## Tools

| Tool | Page | Data |
| --- | --- | --- |
| User story generator | `/user-story-generator/` | `data/user-stories/*.csv` |

The `/review-backlog` skill writes its suggestions to `data/reviews/<backlog>.csv` (second store, `reviews`), only through `.claude/skills/review-backlog/write-review.mjs`. The story form shows them next to the field they concern, with Apply and Dismiss.

The **Backup** button in the file bar copies the open backlog, its review and its proposals (not the `.csv.decided` sidecar) to `data/backups/<backlog>/<date>_<time>/`, after saving any pending edits; a second press in the same second gets a `-2` suffix and nothing is overwritten. The **Backups** tab lists them and compares two of them, or one with the current files, as a colored diff: each CSV is flattened to one `Column: value` line per field and `git diff --no-index` does the rest, so **git must be on the PATH to compare** (backing up needs nothing). `backups` is not a store, so the file API cannot reach it. There is no restore or delete: copy a file back by hand.

Proposed stories live in `data/proposals/<backlog>.csv` (third store, `proposals`): same columns as the backlog, with placeholder IDs `NEW-<n>`. The **Proposed** tab edits them; **Accept story** / **Accept all** move them to the end of their Epic in the backlog.

Two skills fill the Proposed tab. `/explore-stories` talks new stories through against the guidelines, the backlog and the proposals, and never writes a file. `/propose-stories` shows full drafts, asks yes/no, and only after you confirm writes them through `.claude/skills/propose-stories/write-proposal.mjs`, which validates them and **adds** new stories to `data/proposals/<backlog>.csv` with the next free `NEW-<n>` IDs, or **patches** a proposed story (an `id` such as `NEW-8` plus only the fields to change) in place; it never removes a proposal and never touches `data/user-stories/` (running the same batch of new stories twice adds them twice). Both read through `.claude/skills/explore-stories/read-story-context.mjs`, which also prints the sprint-points guideline for sizing. Start them with `.\ai\launchers\explore-stories.ps1 [backlog]` (discussion only, cannot write) or `.\ai\launchers\shape-stories.ps1 [backlog] [story]` (for example `data-portal NEW-57` or `data-portal "a new keyboard"`; the script asks for whatever you leave out; starts in `/explore-stories`; run `/propose-stories` in the same session to save the drafts or apply a fix). Both limit the session to Bash, Skill and AskUserQuestion and load a `locked-settings.json` (a Bash guard allowing only those scripts); `shape-stories.ps1` leaves the writer unapproved, so Claude Code asks before each write. The Proposed tab refreshes from disk when the browser tab is focused, so check it after a batch is written.

The user story CSVs open directly in Excel. Close the file in Excel (or accept that the tool shows "Save failed" and keeps retrying) before editing the same backlog in the tool.

### Story IDs and dependencies

- Each story with an Epic has an ID such as `IAM-0003` in the `ID` column: the initials of the epic's words, then the story's position within its epic (row order). A new story goes to the bottom of its epic. If two epics have the same initials, the later one gets a longer prefix (`DD`, `DDI`).
- IDs are not fixed. They are recomputed when stories are added, deleted, reordered or moved to another epic, and when a file is opened, so reordering rows in Excel also renumbers them. Links in `Depends On` (IDs separated by `;`) are rewritten to follow their story, so they keep pointing at the same story. IDs quoted outside the file (chat, tickets) can go stale.
- Reorder stories by dragging them in the Stories panel of the Editor tab. Drop onto another epic's group to move the story to that epic.
- The Graph tab draws the dependencies, each story to the right of the stories it depends on. Drag from a story's dot onto the story it depends on to add a link (or select a story and use Link); select an arrow and press Delete to remove one. Ctrl+wheel zooms, the wheel and dragging the background pan, and Fit shows the whole graph.
- **Lock** a story (the Locked toggle in the story form, or **Lock selected** in the Stories tab; it needs an ID) to make it reference only: it is not submitted for review (`/review-backlog` still reads it for context), keeps its ID and Epic, cannot be dragged, moved to Proposed or deleted. Its title, points, dependencies and the other fields stay editable. Unlocked stories take the lowest free numbers around locked IDs, so numbering can have gaps. The lock is stored in the `Locked` column (`Yes`). When the review has a strong objection to a locked story it writes an `unlock` row; the story form then shows a banner with **Unlock** and **Dismiss**, and the review's other suggestions for that story cannot be applied until you unlock it.
- The first time an older backlog is opened, IDs are added and the file is saved with the new `ID` and `Depends On` columns.

## Tests

```
npm test
```

## Add a new tool

1. Create `app/frontend/<tool-name>/` with an `index.html` (a `#root` div and a `main.jsx` script, like `app/frontend/user-story-generator/index.html`) and a `main.jsx` that imports `../shared/style.css`. Import `files.js` from `../shared/` and any pure logic from `core/` (`csv.js`, `story-text.js`). Add the page to `build.rollupOptions.input` in `app/frontend/vite.config.mjs`.
2. Register a data folder (for example `data/my-data/`) in `STORES` at the top of `app/backend/server.cjs`:
   ```js
   const STORES = {
     'user-stories': path.join(DATA_DIR, 'user-stories'),
     'my-data': path.join(DATA_DIR, 'my-data'),
   };
   ```
3. In the tool, `createFileStore('my-data')` gives `list`, `read`, `create`, `write`, `rename` and `openFolder` for that folder. Only `.csv` files directly inside a registered folder are reachable.
4. Add a link to the tool in `app/frontend/main.jsx`, then `npm run build`.
