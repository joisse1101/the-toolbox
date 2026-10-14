# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install
npm start            # unified: build if needed + server + open browser (-- --dev for hot reload)
npm run build        # vite build -> app/dist/ (required after any change to app/frontend/ or core/ before the server shows it)
node app/backend/server.cjs   # serves app/dist/ + CSV API on 127.0.0.1:3000 (PORT env to change; TLT_DATA_DIR moves the data folder)
npm run dev          # Vite dev server with HMR; proxies /api to the backend, so run both
npm test             # node --test test/*.test.mjs
node --test test/ids.test.mjs                  # single test file
node --test --test-name-pattern="renumber" test/ids.test.mjs   # single test by name
```

There is no linter or type checker. Tests cover only the pure modules (no DOM/React tests).

## Architecture

Local tools for a team lead, split into four zones that depend on each other in one direction only (`app/` and `.claude/skills/` -> `core/`; nothing depends on `data/`'s contents):

- **`core/`**: pure logic, no DOM, no HTTP, shared by the frontend and the skill scripts. `csv.js` (parse/serialize), `story-text.js` (compose/parse the "As a… I want… so that…" and acceptance-criteria cell text), `file-name.cjs` (`validateName`, the one set of CSV file-name rules), `paths.cjs` (`DATA_DIR`, `GUIDELINES_DIR`; `TLT_DATA_DIR` env overrides the data folder, default `data/`).
  - `model.js`: pure CSV <-> story model. Known columns (`COLUMNS`) are matched by header name; unknown columns round-trip untouched in `story.cells`; unparseable User Story / Acceptance Criteria cells keep raw text.
  - `ids.js`: story IDs (`IAM-0003`: epic-name initials + position within epic) are *derived*, not stable — `renumber` recomputes them on add/delete/reorder/move/open, and rewrites `Depends On` links (`;`-separated IDs) so they follow their story. Keep this invariant when touching story ordering.
  - `review.js`, `proposals.js`, `proposal-input.js`: review-suggestion and proposed-story logic.
- **`app/backend/server.cjs`**: Node-built-ins-only server (no Express) serving `app/dist/` and a small CSV file API. `STORES` at its top is an allow-list mapping store name -> folder under `DATA_DIR` (`user-stories` for backlogs, `reviews` for review suggestions, `proposals` for proposed stories not yet in the backlog). Only `.csv` files directly inside a registered folder are reachable.
- **`app/frontend/`**: multi-page Vite build (pages listed in `build.rollupOptions.input` in `app/frontend/vite.config.mjs`); `main.jsx` is the landing page. `shared/files.js` is the API client (`createFileStore(name)`: `list/read/create/write/rename/openFolder`), `shared/style.css` the common styles. `user-story-generator/` is the only tool so far: `graph.js` (dependency-graph layout for the Graph tab), `hooks/useBacklog.js` (reducer state) and `hooks/useAutosave.js` (debounced save, retries on failure e.g. file locked in Excel), `components/` the tabs. It imports logic from `core/` by relative path.
- **`data/`** (git-ignored, private): `user-stories/`, `reviews/`, `proposals/`. Store names in code, skills and specs (`user-stories/`, `reviews/`, `proposals/`) are relative to this folder.
- **`ai/`**: `guidelines/` (`product-backlog.md`, `sprint-points-guideline.md`) and `launchers/` (the `.ps1` session starters). `.claude/skills/` and `openspec/` stay at the repo root because Claude Code and the OpenSpec CLI look for them there.

Adding a new tool: see the "Add a new tool" steps in `README.md` (new `app/frontend/<tool>/` dir, add to vite inputs, register data folder in `STORES`, link from `app/frontend/main.jsx`).

## Workflow

Changes are managed with OpenSpec (`openspec/`): `specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`), `changes/` holds proposals/archives. Use the `opsx:*` skills (propose / apply / archive). Commits use conventional-commit prefixes (`feat:`, `style:`, `chore(openspec):`).

The `review-backlog` skill (`.claude/skills/review-backlog/SKILL.md`) reviews a backlog CSV against `ai/guidelines/product-backlog.md` (hierarchy, INVEST, acceptance criteria) and reports; it never edits the backlog CSV. Its suggestions are written to `data/reviews/<backlog>.csv` only through `.claude/skills/review-backlog/write-review.mjs` (validation and CSV logic in `core/review.js`, shared with the portal's Apply/Dismiss). A long review is written in batches: the first run replaces the review, later runs add `--append` (each batch validated alone; `guard-bash.mjs` allows both forms). Statuses the user already decided are kept aside in `data/reviews/<backlog>.csv.decided` so later batches can restore them.

The `explore-stories` and `propose-stories` skills draft new stories. `explore-stories` only discusses (never writes). `propose-stories` shows full drafts, asks yes/no, and after a separate confirmation writes them through `.claude/skills/propose-stories/write-proposal.mjs` (stories as JSON on stdin; validation in `core/proposal-input.js`). The writer only **adds** rows to `data/proposals/<backlog>.csv` with `NEW-<n>` IDs by the portal's rule (`nextPlaceholder`), creates the file with the backlog's columns when missing, and never writes `data/user-stories/`. Both skills read through `.claude/skills/explore-stories/read-story-context.mjs`, and their `locked-settings.json` run `.claude/skills/explore-stories/guard-bash.mjs` with `--read-only` or `--read-write`; the sessions are started by `ai/launchers/explore-stories.ps1` and `ai/launchers/propose-stories.ps1` (tool limits and settings, like `ai/launchers/review-backlog.ps1`). Like the review skill, both cite `ai/guidelines/product-backlog.md` and do not restate it.

The repo is ESM (`"type": "module"` in `package.json`); `app/backend/server.cjs`, `core/file-name.cjs` and `core/paths.cjs` stay CommonJS (the `.cjs` extension), so the server and the ESM skill scripts can share them.

`ai/guidelines/product-backlog.md` is the single source of backlog standards (epic/feature/story/AC definitions, the 13-point size cap, INVEST) used for both writing and reviewing stories; the review skill cites it and does not restate it. `ai/guidelines/sprint-points-guideline.md` covers point sizing benchmarks.
