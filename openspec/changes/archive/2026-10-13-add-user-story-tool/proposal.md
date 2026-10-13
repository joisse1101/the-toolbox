## Why

Writing user stories (epic > capability > feature, as-a / I-want / so-that, sprint points, Given/When/Then acceptance criteria) is repetitive, and the stories need to live in plain CSV files that can be opened directly in Excel. A first single-HTML-file prototype could not read or write files on disk, and it does not scale to the suite of team-lead tools and helpers this repo is meant to grow into.

## What Changes

- Add a small local Node server (no npm dependencies) that serves static tool pages and exposes a file API restricted to named data folders.
- Add a `shared/` browser module set (CSV parse/serialize, file API client, common styles) that every tool reuses.
- Add the User Story tool: pick a backlog CSV from a dropdown listing `user-stories/*.csv`, edit stories, and have changes auto-saved back to that CSV.
- Support creating a new backlog (`new-backlog.csv`, auto-numbered if taken), renaming a backlog file, and opening the `user-stories/` folder in File Explorer.
- Store each story as one CSV row with eight columns (including an optional Priority dropdown: Critical, High, Medium, Low, and an optional free-text Notes field), writing the user story as one sentence (`As a …, I want …, so that …`) and all acceptance criteria as one multi-line cell (`AC1: Given …, when I …, then I am …`), parsed back into form fields on load, with a live preview of both.
- Choose Sprint points with one-click buttons (1, 2, 3, 5, 8, 13, 21, 34, 55); stories above 13 are highlighted in the list and on the form as candidates to split.
- Add a shared sprint-points estimation guideline (Fibonacci scale; complexity, effort, uncertainty and reference stories) kept in an editable file and shown from an info control beside Sprint points.
- Preserve unrecognised CSV columns when saving, so files edited in Excel or exported from other tools are not damaged.
- Non-goals: delete or duplicate files, multi-user access, authentication, hosting, a CSV preview pane, a frontend framework or build step.

## Capabilities

### New Capabilities
- `csv-file-store`: server-side file API limited to a registered data folder (list, read, create, write, rename, open-in-explorer) with filename validation and path-traversal protection.
- `user-story-editor`: browser tool for editing user-story backlogs stored as CSV, including the story fields, multiple acceptance criteria, file dropdown, New/Rename, auto-save and unknown-column preservation.

### Modified Capabilities
<!-- None: no existing specs. -->

## Impact

- New files: `server.js`, `public/index.html` (tool launcher), `public/shared/*`, `public/user-story-generator/*`.
- Reads and writes `user-stories/*.csv` only; no other folder is reachable through the API.
- Requires Node (already installed); started with `node server.js`, bound to localhost only.
- The earlier standalone `user-story-generator.html` was already deleted by the user and is not carried forward.
