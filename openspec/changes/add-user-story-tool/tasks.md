## 1. Server and file API

- [ ] 1.1 Create `server.js` (Node built-ins only) serving `public/` on `127.0.0.1` with a MIME map and a path check; verify `node server.js` then `http://localhost:<port>/` loads and `/../server.js` returns 404
- [ ] 1.2 Add the store allow-list (`user-stories` -> `./user-stories`) and a single filename validator (no separators, invalid Windows characters, `..`, reserved names, forced `.csv`); verify with a small node test script that bad names are rejected and good names pass
- [ ] 1.3 Implement `GET /api/<store>/files` (sorted `.csv` only, empty list when none) and `GET /api/<store>/files/<name>` (404 when missing); verify with curl against sample files including a non-CSV
- [ ] 1.4 Implement `POST /api/<store>/files` create using exclusive open and auto-numbering (`name-2.csv`, ...); verify two consecutive creates yield `new-backlog.csv` then `new-backlog-2.csv` and an existing file is never modified
- [ ] 1.5 Implement `PUT /api/<store>/files/<name>` write, mapping `EBUSY`/`EPERM`/`EACCES` to a distinct locked error; verify success write, and verify the error path by holding the file open in Excel (or an exclusive-lock script)
- [ ] 1.6 Implement `PATCH /api/<store>/files/<name>` rename (append `.csv`, reject invalid names, 409 if target exists); verify success, conflict and invalid-name cases with curl
- [ ] 1.7 Implement `POST /api/<store>/open` using `spawn('explorer.exe', [folder])` with the folder from the allow-list; verify File Explorer opens `user-stories/`
- [ ] 1.8 Require the `X-Requested-With` header on all non-GET `/api` routes and send no CORS headers; verify a request without the header is rejected and unknown stores return 404

## 2. Shared browser modules

- [ ] 2.1 Write `public/shared/csv.js` with `parseCsv` and `toCsv` (quotes, commas, CRLF/LF, embedded newlines, leading BOM stripped); verify a node test round-trips tricky values unchanged
- [ ] 2.1a Write `public/shared/story-text.js` (`composeStory`, `parseStory`, `composeCriteria`, `parseCriteria`, case-insensitive first-occurrence keyword split, `AC<n>:` ignored); verify a node test covers compose/parse round trip, multiple criteria lines, missing keywords returning a parse failure, and case-insensitive keywords
- [ ] 2.2 Write `public/shared/files.js` (list, read, create, write, rename, openFolder with the required header and readable error messages incl. locked); verify against the running server from the browser console
- [ ] 2.3 Write `public/shared/style.css` (light/dark, form, buttons, status chip) and `public/index.html` launcher linking to the tools; verify the launcher renders and links to the user story tool

## 3. User story editor

- [ ] 3.1 Build the page shell `public/user-story-generator/index.html` + `app.js`: file dropdown, New, filename box (rename), Open folder, save status; verify the dropdown lists the CSVs in `user-stories/` and shows an empty-state prompt with none
- [ ] 3.2 Implement the CSV <-> story model: header-name matching (any order, case-insensitive) for `Epic, Capability, Feature, User Story, Sprint points, Priority, Acceptance Criteria, Notes`, using `story-text.js` for the two syntax cells, unknown columns carried through per row, raw text kept for unparseable cells; verify by loading a sample file with an extra `Jira Key` column, reordered headers and one malformed `User Story` cell, saving, and diffing that the extra column and the malformed cell are unchanged
- [ ] 3.3 Build the story form: Epic/Capability/Feature, As a/I want/So that, Sprint points button group (1, 2, 3, 5, 8, 13, 21, 34, 55; click to select, click again to clear; no number input and no off-scale hint), split highlight for points above 13 on the form and in the story list, Priority dropdown (Critical/High/Medium/Low/none, extra option for unrecognised loaded values), multi-line Notes textarea, add/remove acceptance criteria with renumbering; verify each field, that selecting 21 highlights the story in both places while 13 does not, that a file with `Sprint points = 4` shows no selected button and no hint yet keeps `4` after save, that `100` is still highlighted, that multi-line Notes round-trips through the CSV, that a file with `Priority = Urgent` keeps `Urgent` after save, and the add/remove behaviour manually
- [ ] 3.3a Add the two read-only live previews (story sentence under the story fields, `AC<n>: …` lines under the criteria) fed by `story-text.js`, plus a visible warning on unparseable cells; verify the preview text equals the saved CSV cell text exactly and the warning appears for the malformed sample
- [ ] 3.3b Create `public/user-story-generator/sprint-points-guideline.md` with starter content (scale, four lenses, reference-story slot, "above 13: split"), add the info button beside Sprint points (hover/focus popover, click to pin), and the loading-failed message; verify the popover shows the file text, editing the file then reloading changes it, and deleting the file shows the unavailable message
- [ ] 3.4 Build the story list (add story, select, delete selected); verify adding three stories and deleting the middle one leaves the right two
- [ ] 3.5 Wire New and Rename: New creates and selects the file and focuses the name box; Rename updates the dropdown, keeps the selection, and shows server errors without changing the name; verify New twice gives `new-backlog.csv` then `-2`, and renaming to an existing name shows the error
- [ ] 3.6 Implement debounced auto-save (one write in flight, latest wins), status states saved/saving/failed, retry with backoff on failure, and a `beforeunload` warning while pending or failed; verify edits appear in the CSV within about a second and that a locked file shows the failure then recovers when closed in Excel
- [ ] 3.7 Re-read the file on dropdown selection and on tab refocus; verify an edit made and saved in Excel appears in the tool after returning to the tab
- [ ] 3.8 Wire Open folder button; verify it opens `user-stories/` in File Explorer

## 4. End-to-end check

- [ ] 4.1 Walk through: start the server, New backlog, rename it, enter a story with two acceptance criteria containing commas, quotes and a line break, open the CSV in Excel, confirm columns/values, edit in Excel, return to the tool and confirm it picks up the edit
- [ ] 4.2 Add a short `README.md` with how to start the server and how to add a new tool/store; verify a fresh reader can follow it to launch the tool
