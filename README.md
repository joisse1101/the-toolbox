# Team lead tools

Small local tools for a team lead. Each tool is a React page (built with Vite) that keeps its data as plain CSV files in `data/`. The local server itself uses Node built-ins only.

## Layout

| Folder | What it is |
| --- | --- |
| `app/frontend/` | The React pages and the Vite config. Builds into `app/dist/`. |
| `app/backend/` | `server.cjs`: serves `app/dist/` and the CSV file API. |
| `core/` | Pure logic with no UI or server: CSV parsing, the story model, IDs, reviews, proposals, the lexicon. Used by the frontend and by the skill scripts. |
| `data/` | Your private data (git-ignored): `user-stories/`, `reviews/`, `proposals/`, `lexicons/`, `lexicon-suggestions/`, `backups/`, `logs/` (`writes.jsonl`, one line per save by the portal or a writer, no contents: it shows who wrote a file last). Set `TLT_DATA_DIR` to keep it somewhere else, for example outside the repo. |
| `ai/` | What the AI works from: `guidelines/` (backlog standards, point sizing) and `launchers/` (the `.ps1` session starters). |
| `.claude/skills/` | The skills and their scripts (must stay here for Claude Code to find them). |
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

The `/review-backlog` skill writes its suggestions to `data/reviews/<backlog>.csv` (second store, `reviews`), only through `.claude/skills/review-backlog/write-review.mjs`. The story form shows them next to the field they concern, with Apply and Dismiss. Open questions are suggested as `Clarifications` rows; Apply adds them as unanswered questions. A review run without `--append` replaces the whole review, these rows included.

The **Backup** button in the file bar copies the open backlog, its review, its proposals, its lexicon and its lexicon suggestions (not the `.csv.decided` sidecar) to `data/backups/<backlog>/<date>_<time>/`, after saving any pending edits; a second press in the same second gets a `-2` suffix and nothing is overwritten. The **Backups** tab lists them and compares two of them, or one with the current files, as a colored diff: each CSV is flattened to one `Column: value` line per field and `git diff --no-index` does the rest, so **git must be on the PATH to compare** (backing up needs nothing). `backups` is not a store, so the file API cannot reach it. There is no restore or delete: copy a file back by hand.

Proposed stories live in `data/proposals/<backlog>.csv` (third store, `proposals`): same columns as the backlog, with placeholder IDs `NEW-<n>`. The **Proposed** tab edits them; **Accept story** / **Accept all** move them to the end of their Epic in the backlog. A **benched** story (a checkbox in its form) is parked: it cannot be accepted until you un-bench it, and the skills do not see it. Every story has a **Clarifications** section (questions and answers; a question without an answer is open and shows as "N open" in the lists). Open questions block nothing, and the text moves with the story when it is accepted or moved back to Proposed.

The **Lexicon** tab keeps one list of defined terms per backlog, in `data/lexicons/<backlog>.csv` (fourth store, `lexicons`; it opens in Excel, and Backup and the Backups tab cover it). Each term has a **Definition**, an optional **Part of** parent (so "Dataset attribute" sits under "Dataset"), an **Avoid** list of words stories must not use for it (separated by `;`) and **Notes**. The tab lists terms with children indented, searches names, definitions and avoided words, and saves a term when you leave a field. It refuses a term with no definition, a parent that is not a term or makes a cycle, an avoided word that is itself a term, and deleting a term that others are part of; renaming a term updates its children. When `/propose-stories` suggests renaming or deleting a term, the suggestions are listed at the top of the tab (`data/lexicon-suggestions/<backlog>.csv`, fifth store, `lexicon-suggestions`; also in Backup and the Backups tab) with their impact: terms that use the old name in their wording, and terms that are part of it. **Apply** does the same rename or delete as by hand; a rename also adds the old name (and any other suggested word, each a checkbox) to the term's Avoid list in the same save, so the old name can be an Avoid word at once. A delete is refused while the term has children. A suggestion whose term is gone, or whose new name is now taken, can only be dismissed. The two skills below read the lexicon and use its terms; `/propose-stories` can add or change terms too (see below).

Two skills fill the Proposed tab. `/explore-stories` talks new stories through against the guidelines, the backlog and the proposals, and never writes a file. `/propose-stories` shows full drafts, asks yes/no, and only after you confirm writes them through the `write_proposals` tool, which validates them and **adds** new stories to `data/proposals/<backlog>.csv` with the next free `NEW-<n>` IDs, or **patches** a proposed story (an `id` such as `NEW-8` plus only the fields to change) in place; both can carry `clarifications` (new questions, answers to questions that are still empty, and, in a patch, `resolve` to move a question the user answered into Notes as a decision and remove it); it never removes a proposal and never touches `data/user-stories/` (a new story whose Epic, Feature and Title are already in the proposals is skipped, so sending a batch again is safe). The writer reads the file back after writing and the skill reads every file back before it says anything is written. The same skill (and `/story:propose`, which skips the yes/no) also turns an agreed change to a story already in the backlog into a suggestion in the story editor: one review row appended to `data/reviews/<backlog>.csv` through the `write_review` tool (it always appends, so the review's other suggestions are kept), which you apply or dismiss on that story; an edit to a locked story comes with an `unlock` row and cannot be applied until you unlock it. The same skill (and `/story:propose`) also adds or patches lexicon terms through the `write_lexicon` tool, shown in the same reply and covered by the same yes/no; terms go straight into `data/lexicons/<backlog>.csv`, are written before the stories so a story can use a term defined in the same run, and are never removed or renamed by that tool: a rename or delete goes through `suggest_lexicon_change`, which only adds a suggestion for you to apply in the Lexicon tab. The seven tools (`read_context`, `search_stories`, `check_drafts`, `write_proposals`, `write_lexicon`, `suggest_lexicon_change`, `write_review`) are the `story-tools` MCP server, `ai/mcp/story-tools.mjs`; their descriptions carry the rules, so the agent needs no shell. `check_drafts` validates drafts with the writers' rules and writes nothing, so a rejected story is found before you are asked to confirm. Both skills read through `read_context`, which also returns the sprint-points guideline for sizing and (to check what a writer wrote) the review rows and the open lexicon suggestions. The backlog's lexicon and its proposals can be large, so the sessions read those two files with `Read` and `Grep`, limited to exactly those two files by a hook (`ai/mcp/guard-read.mjs`); each launcher prints the two file paths and waits for you to press Enter before it starts Claude (type `n` to cancel). Start them with `.\ai\launchers\explore-stories.ps1 [backlog]` (discussion only, cannot write) or `.\ai\launchers\shape-stories.ps1 [backlog] [story]` (for example `data-portal NEW-57`, `data-portal IAM-0004` for a story already in the backlog, or `data-portal "a new keyboard"`; the script asks for whatever you leave out; starts in `/explore-stories`; run `/propose-stories` in the same session to save the drafts or apply a fix). Both limit the session to the `story-tools` server (`--read-only`, so `read_context` and `search_stories` only, for `explore-stories.ps1`), Skill, AskUserQuestion, and Read and Grep on the two files above, with no Bash, and pin `--permission-mode default`; the readers (`read_context`, `search_stories`) and `check_drafts` (none writes) are pre-approved and the writers are not, so Claude Code asks before each write. The old scripts (`write-proposal.mjs` and the others) still work from the command line. The Proposed tab refreshes from disk when the browser tab is focused, so check it after a batch is written.

The user story CSVs open directly in Excel. Close the file in Excel (or accept that the tool shows "Save failed" and keeps retrying) before editing the same backlog in the tool.

### Story IDs and dependencies

- Each story with an Epic has an ID such as `IAM-0003` in the `ID` column: the initials of the epic's words, then the story's position within its epic (row order). A new story goes to the bottom of its epic. If two epics have the same initials, the later one gets a longer prefix (`DD`, `DDI`).
- IDs are not fixed. They are recomputed when stories are added, deleted, reordered or moved to another epic, and when a file is opened, so reordering rows in Excel also renumbers them. Links in `Depends On` (IDs separated by `;`) are rewritten to follow their story, so they keep pointing at the same story. IDs quoted outside the file (chat, tickets) can go stale.
- Reorder stories by dragging them in the Stories panel of the Editor tab. Drop onto another epic's group to move the story to that epic.
- The Graph tab draws the dependencies, each story to the right of the stories it depends on. Stories linked to each other form a cluster, drawn in its own labelled band (largest first), and arrows never pass through a story box. Drag from a story's dot onto the story it depends on to add a link (or select a story and use Link); select an arrow and press Delete to remove one. Ctrl+wheel zooms, the wheel and dragging the background pan, and Fit shows the whole graph.
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
