# the-toolbox

Two separate things live here.

- **`planner/`** is the backlog planner, for this repo only. The portal (a React page built with Vite) shows and edits user stories as plain CSV files in a data folder. The local server uses Node built-ins only.
- **`toolkit/`** is a set of Claude skills, commands and rules you install globally and use anywhere, including the four story skills that fill the planner's data folder (see [Story skills](#story-skills)). The toolkit imports nothing from `planner/`: see [`toolkit/README.md`](toolkit/README.md).

## Layout

| Folder | What it is |
| --- | --- |
| `planner/portal/web/` | The React pages and the Vite config. Builds into `planner/portal/dist/`. |
| `planner/portal/server/` | `server.cjs`: serves `planner/portal/dist/` and the CSV file API. |
| `planner/logic/` | Pure logic with no UI or server, by domain: CSV parsing, the story model, IDs, reviews, proposals, the lexicon, storage paths. Used by the portal and copied into the story skills by the sync script. |
| `planner/data/` | Your private data (git-ignored): one folder per backlog (see [Data layout](#data-layout)). The folder is set in the project config (see [Project config](#project-config)). Coming from the older layout (`backlogs/`, `reviews/`, ...)? See [Data layout](#data-layout). |
| `planner/guidelines/` | Backlog standards, point sizing and diagram conventions, shown in the portal and copied into the story skills. |
| `planner/scripts/` | `sync-skill-logic.mjs`: writes the shared logic and guidelines into each story skill (see [Story skills](#story-skills)). |
| `openspec/` | Specs and change history (must stay at the root for the OpenSpec CLI). |
| `toolkit/` | Reusable Claude skills, slash commands and rules, with an installer, including the story skills. How to install and use it: [`toolkit/README.md`](toolkit/README.md). |
| `planner/test/` | Tests, in `logic/` and `portal/`, plus the zone and sync checks. The story skills' own tests are in `toolkit/tests/story/`. |

## Run

```
cd planner       # package.json and node_modules live here
npm install      # once
npm start        # builds if needed, runs the server, opens http://localhost:3000/
npm start -- --dev   # server + Vite dev server with hot reload (http://localhost:5173/)
```

Options after `--`: `--build` forces a rebuild, `--no-open` skips opening the browser. Set `PORT` to use another port. The server listens on `127.0.0.1` only. Stop everything with Ctrl+C.

You can still run the pieces yourself: `npm run build`, `node planner/portal/server/server.cjs`, `npm run dev` (needs the server running; it proxies `/api`).

## Project config

- The config file is `planner/planner.config.yaml`. It is git-ignored: copy `planner/planner.config.example.yaml` and edit it.
- `projectName`: shown in the portal header. Default: empty.
- `dataDir`: the folder holding your data, absolute or relative to the config file's folder. Default: `planner/data`, also used when there is no config file.
- `codeBase`: the folder of a code base you work on, absolute or relative to the config file's folder. The data folder is then `<codeBase>/.plans/`, with the layout in [Data layout](#data-layout). You never type `.plans`.
- `projects`: an optional list of saved projects, each with one path (`codeBase` or `dataDir`) and an optional `name`. The top-level `codeBase` or `dataDir` stays the active project. Without a list, the active folder shows as one project, and the list is written the first time you add a project. Code older than the list refuses the key: delete it to roll back.
- Set `codeBase` or `dataDir`, not both. A config with both stops the server with a message naming both keys.
- All keys are optional. An unknown key or a bad value stops the server with a message naming it.
- `PLANNER_CONFIG` names another config file to use instead.
- Project dropdown (left of the Backlog dropdown): lists the saved projects, with **Add Project…** first. Choosing a project saves its path as the active one and reloads; no file is touched. A project whose folder is gone is shown disabled. Add Project links a code base (optional name; offers to create `.plans/` and a first backlog when it has none) or creates a new project in `planner/data/<name>`.
- Settings tab: change the project name, the data folder or the code base while the portal runs. Change folder and **Change code base** open your system's folder dialog and then **relocate** the current project: its backlogs are copied to the new folder and its saved path is replaced, not added. An empty or missing folder is copied to without a prompt (a code base gets `.plans/`). The path is saved only after every copied file has been read back, so a failed copy shows its reason and changes nothing. The old folder keeps its files.
- When the new folder already holds backlog folders, the tab lists the files an overwrite would replace and asks: **Overwrite** (same-named files take your data, other files stay), **Just switch** (copy nothing, use the files there) or **Cancel**. A folder with only the older layout is switched to, and the tab offers **Migrate** (see [Data layout](#data-layout)). **Create missing folders** (init) and **Move data into a code base** (the same relocation, for a `dataDir` setup) stay on the tab.
- The story skills look only in the folder the Claude session started in, never in a parent folder. Their order is: the file `PLANNER_CONFIG` names, else a `.plans/` folder in the current folder, else a `planner.config.yaml` in the current folder. They read only the `codeBase` and `dataDir` lines, from a flat `key: value` file.
- If nothing is found, a skill tells you and asks before creating `.plans/` in the current folder. `jois-story-explore` only reports it, because it never writes. A skill creates an empty `.plans/` but never a backlog: create a backlog in the portal.
- Start the session in the code base folder. A session started in a sub-folder finds nothing, and the message names the folder it looked in.
- Restart a Claude session after you switch the data folder.
- Committing `.plans/` is the code base owner's choice. Anyone with the code base sees a committed `.plans/`, and it stays in history. The planner never edits `.gitignore`: add `.plans/` there yourself to keep it private.

Coming from the `PLANNER_DATA_DIR` or `TLT_DATA_DIR` variable?
- The variables are no longer read.
- Create `planner/planner.config.yaml` once with `dataDir` set to the same path, then remove the variable.

## Data layout

Each backlog is one folder in the data folder, named by the backlog's name (no `.csv`). Every file has a fixed name inside it.

```
<dataDir>/<backlog>/user-stories.csv                      the backlog
<dataDir>/<backlog>/user-stories/review.csv               review suggestions (+ review.csv.decided)
<dataDir>/<backlog>/user-stories/proposals.csv            proposed stories
<dataDir>/<backlog>/lexicon.csv                           defined terms
<dataDir>/<backlog>/lexicon/lexicon-suggestions.csv       suggested term changes
<dataDir>/<backlog>/slices/<slice>/                       jois-story-plan documents
<dataDir>/<backlog>/context-map.json, context-map.md
```

- `<dataDir>` here is whichever data folder is served: `planner/data`, a `dataDir` folder, or `<codeBase>/.plans`.
- A folder is a backlog when it holds `user-stories.csv`. `logs` is reserved and cannot be a backlog name (earlier versions kept a `logs/` folder there).
- Older layout (it may also hold a `repo.json` per backlog, which is copied but no longer used): `backlogs/`, `reviews/`, `proposals/`, `lexicons/`, `lexicon-suggestions/` and `diagrams/` (one file per backlog in each).
  - The portal shows a notice when the data folder holds it. **Migrate** in the Settings tab copies it into the new layout on request only.
  - It never changes or deletes the old files, never overwrites a new file, reads each copy back, and reports the files it could not match.
  - Remove the old folders by hand when you are satisfied.
- There is no backup feature. Copy a backlog's folder, or keep the data folder in version control of your own.

## Tools

| Tool | Page | Data |
| --- | --- | --- |
| Backlog portal | `/backlog-portal/` | `planner/data/<backlog>/` |

The `jois-story-review` skill writes its suggestions to `planner/data/<backlog>/user-stories/review.csv` (kind `review`), only through its `write-review.mjs`. The story form shows them next to the field they concern, with Apply and Dismiss. Open questions are suggested as `Clarifications` rows; Apply adds them as unanswered questions. A review run without `--append` replaces the whole review, these rows included.

Proposed stories live in `planner/data/<backlog>/user-stories/proposals.csv` (kind `proposals`): same columns as the backlog, with placeholder IDs `NEW-<n>`. The **Proposed** tab edits them; **Accept story** / **Accept all** move them to the end of their Epic in the backlog. A **benched** story (a checkbox in its form) is parked: it cannot be accepted until you un-bench it, and the skills do not see it. Every story has a **Clarifications** section (questions and answers; a question without an answer is open and shows as "N open" in the lists). Open questions block nothing, and the text moves with the story when it is accepted or moved back to Proposed.

The **Lexicon** tab keeps one list of defined terms per backlog, in `planner/data/<backlog>/lexicon.csv` (kind `lexicon`; it opens in Excel). Each term has a **Definition**, an optional **Part of** parent (so "Dataset attribute" sits under "Dataset"), an **Avoid** list of words stories must not use for it (separated by `;`) and **Notes**. The tab lists terms with children indented, searches names, definitions and avoided words, and saves a term when you leave a field. It refuses a term with no definition, a parent that is not a term or makes a cycle, an avoided word that is itself a term, and deleting a term that others are part of; renaming a term updates its children. When `jois-story-propose` suggests renaming or deleting a term, the suggestions are listed at the top of the tab (`planner/data/<backlog>/lexicon/lexicon-suggestions.csv`, kind `lexicon-suggestions`) with their impact: terms that use the old name in their wording, and terms that are part of it. **Apply** does the same rename or delete as by hand; a rename also adds the old name (and any other suggested word, each a checkbox) to the term's Avoid list in the same save, so the old name can be an Avoid word at once. A delete is refused while the term has children. A suggestion whose term is gone, or whose new name is now taken, can only be dismissed. The two skills below read the lexicon and use its terms; `jois-story-propose` can add or change terms too (see [Story skills](#story-skills)).

## Story skills

The four story skills are global toolkit items, so they run in any folder once installed (see [`toolkit/README.md`](toolkit/README.md)). They find your data folder as in [Project config](#project-config).

| Skill | What it does | Writes |
| --- | --- | --- |
| `jois-story-explore` | Talks new stories through against the guidelines, the backlog and the proposals. | Nothing. |
| `jois-story-propose` | Shows full drafts, asks yes/no, then saves them. | `proposals.csv`, `lexicon.csv`, `review.csv`, `lexicon-suggestions.csv` |
| `jois-story-review` | Reviews the whole backlog against the guidelines and reports. | `review.csv` suggestions only; never the backlog. |
| `jois-story-plan` | Turns the shaped stories of one Epic, Feature or story into a use-case specification and Mermaid diagrams. | `slices/<slice>/`, `context-map.json` and `.md` |

### Commands

- `/jois-story:propose`: the propose skill without the yes/no.
- `/jois-story:re-read`: re-reads the backlog, proposals, lexicon and the stories under discussion after you changed them yourself.
- `/jois-story:review`: audits only what is under discussion, ending in a checklist of what to do in the portal, with `/jois-story:propose` or by decision.

### How the skills write

- Each writer is a script the skill runs with Bash, for example `node <skill folder>/write-proposal.mjs`. It checks everything first, writes nothing when one item is invalid, writes atomically and reads the file back.
- `--check` on a writer validates without writing.
- The skills read with ordinary file tools and their own reader scripts. Nothing confines reading.
- Stories are named by Title as well as ID, because IDs shift when the backlog is renumbered. A script refuses an ID whose Title does not match.
- `jois-story-propose` adds new stories to `proposals.csv` with the next free `NEW-<n>` ID, or patches a proposed story in place. It never removes a proposal and never writes `user-stories.csv`. A new story whose Epic, Feature and Title are already in the proposals is skipped, so sending a batch again is safe.
- The same skill turns an agreed change to a story already in the backlog into one review row (it always appends), which you apply or dismiss in the story editor. An edit to a locked story comes with an `unlock` row.
- It also adds lexicon terms (`write-lexicon.mjs`) and suggests renames, deletes and edits (`suggest-lexicon.mjs`), which you apply in the Lexicon tab.
- A **benched** story (a checkbox in the Proposed form) is skipped by the skills and cannot be accepted until you un-bench it.
- The Proposed tab refreshes from disk when the browser tab is focused.

### The generated copy and the sync script

- The planner's logic and guidelines are the source for what the portal and the skills share. Each skill carries a generated copy in its own `lib/` and `references/` folders, so it needs nothing from `planner/`.
- `node planner/scripts/sync-skill-logic.mjs` writes the copies. Every copied file starts with a line naming its source and saying not to edit it.
- `planner/test/skill-sync.test.mjs` (the drift test) fails when a committed copy differs from its source. Run the script after changing `planner/logic/` or `planner/guidelines/`.
- `planner/logic/diagrams/` no longer exists: the diagram logic belongs to `jois-story-plan`.

### Plan skill details

- A slice folder holds `UC-<slice>.md` (specification, class diagram, one sequence diagram per flow, design sections) and `source.json` (the stories by Title and a hash of their text, so it can report a slice as stale).
- `slices` is not a kind, so the portal's file API cannot reach it.
- The rules are in `planner/guidelines/diagram-conventions.md`, copied into the skill as `references/diagram-conventions.md`.
- Its writer checks Mermaid's syntax with the `mermaid` and `jsdom` packages in the skill's own folder. The installer runs `npm ci` there; the writer says to run it when the packages are missing.
- The skill reads the code base in the current folder with ordinary file tools. There is no repo setting.
- The skill can also draw a **context map** of the backlog with you (`context-map.json` and `context-map.md` in the backlog's folder).
- Open a slice's `UC-<slice>.md` on GitHub or in the VS Code markdown preview.

The CSV files open directly in Excel. Close the file in Excel (or accept that the tool shows "Save failed" and keeps retrying) before editing the same backlog in the tool.

## Story IDs and dependencies

- Each story with an Epic has an ID such as `IAM-0003` in the `ID` column: the initials of the epic's words, then the story's position within its epic (row order). A new story goes to the bottom of its epic. If two epics have the same initials, the later one gets a longer prefix (`DD`, `DDI`).
- IDs are not fixed. They are recomputed when stories are added, deleted, reordered or moved to another epic, and when a file is opened, so reordering rows in Excel also renumbers them. Links in `Depends On` (IDs separated by `;`) are rewritten to follow their story, so they keep pointing at the same story. IDs quoted outside the file (chat, tickets) can go stale.
- Reorder stories by dragging them in the Stories panel of the Editor tab. Drop onto another epic's group to move the story to that epic.
- The Graph tab draws the dependencies, each story to the right of the stories it depends on. Stories linked to each other form a cluster, drawn in its own labelled band (largest first), and arrows never pass through a story box. Drag from a story's dot onto the story it depends on to add a link (or select a story and use Link); select an arrow and press Delete to remove one. Ctrl+wheel zooms, the wheel and dragging the background pan, and Fit shows the whole graph.
- **Lock** a story (the Locked toggle in the story form, or **Lock selected** in the Stories tab; it needs an ID) to make it reference only: it is not submitted for review (`jois-story-review` still reads it for context), keeps its ID and Epic, cannot be dragged, moved to Proposed or deleted. Its title, points, dependencies and the other fields stay editable. Unlocked stories take the lowest free numbers around locked IDs, so numbering can have gaps. The lock is stored in the `Locked` column (`Yes`). When the review has a strong objection to a locked story it writes an `unlock` row; the story form then shows a banner with **Unlock** and **Dismiss**, and the review's other suggestions for that story cannot be applied until you unlock it.
- The first time an older backlog is opened, IDs are added and the file is saved with the new `ID` and `Depends On` columns.

## Tests

- `npm test`, from `planner/`: the portal, the logic, the zone rules and the sync drift test.
- `node --test toolkit/tests/story/*.test.mjs`: the story skills' scripts.
- `python -m pytest` and `python check_toolkit.py`, from `toolkit/`: the toolkit items and installer.

## Add a new tool

1. Create `planner/portal/web/<tool-name>/` with an `index.html` (a `#root` div and a `main.jsx` script, like `planner/portal/web/backlog-portal/index.html`) and a `main.jsx` that imports `../shared/style.css`. Import `files.js` from `../shared/` and any pure logic from `planner/logic/` (`csv.js`, `story-text.js`). Add the page to `build.rollupOptions.input` in `planner/portal/web/vite.config.mjs`.
2. Register a new kind of file in `KIND_FILES` in `planner/logic/storage/backlog-paths.cjs`: its name and its fixed path inside a backlog folder (for example `'my-data': ['my-data.csv']`). The server's `STORES` is built from those kinds.
3. In the tool, `createFileStore('my-data')` gives `list`, `read`, `create`, `write`, `rename` and `openFolder` for that kind, one file per backlog. Only the registered kinds are reachable.
4. Add a link to the tool in `planner/portal/web/main.jsx`, then `npm run build`.
