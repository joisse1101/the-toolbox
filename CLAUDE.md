# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install
npm run build        # vite build -> dist/ (required after any change to src/ before node server.cjs shows it)
node server.cjs       # serves dist/ + CSV API on 127.0.0.1:3000 (PORT env to change)
npm run dev          # Vite dev server with HMR; proxies /api to server.cjs, so run both
npm test             # node --test test/*.test.mjs
node --test test/ids.test.mjs                  # single test file
node --test --test-name-pattern="renumber" test/ids.test.mjs   # single test by name
```

There is no linter or type checker. Tests cover only the pure modules (no DOM/React tests).

## Architecture

Local tools for a team lead: each tool is a separate React page (multi-page Vite build, pages listed in `build.rollupOptions.input` in `vite.config.mjs`) whose data lives as plain `.csv` files in the repo. `server.cjs` is a Node-built-ins-only server (no Express) that serves `dist/` and a small CSV file API.

- **Stores**: `STORES` at the top of `server.cjs` is an allow-list mapping store name -> folder (`user-stories/` for backlogs, `reviews/` for review suggestions, `proposals/` for proposed stories not yet in the backlog). Only `.csv` files directly inside a registered folder are reachable. The client side counterpart is `createFileStore(name)` in `src/shared/files.js` (`list/read/create/write/rename/openFolder`).
- **`src/shared/`**: tool-agnostic code — `csv.js` (parse/serialize), `files.js` (API client), `story-text.js` (compose/parse the "As a… I want… so that…" and acceptance-criteria cell text), `style.css`.
- **`src/user-story-generator/`**: the only tool so far.
  - `model.js`: pure CSV <-> story model. Known columns (`COLUMNS`) are matched by header name; unknown columns round-trip untouched in `story.cells`; unparseable User Story / Acceptance Criteria cells keep raw text.
  - `ids.js`: story IDs (`IAM-0003`: epic-name initials + position within epic) are *derived*, not stable — `renumber` recomputes them on add/delete/reorder/move/open, and rewrites `Depends On` links (`;`-separated IDs) so they follow their story. Keep this invariant when touching story ordering.
  - `graph.js`: dependency-graph layout for the Graph tab (stories placed right of their dependencies).
  - `hooks/useBacklog.js` (reducer state) and `hooks/useAutosave.js` (debounced save, retries on failure e.g. file locked in Excel); `components/` holds the Stories and Graph tabs.
- `src/main.jsx` is the landing page linking to each tool.

Adding a new tool: see the "Add a new tool" steps in `README.md` (new `src/<tool>/` dir, add to vite inputs, register data folder in `STORES`, link from `src/main.jsx`).

## Workflow

Changes are managed with OpenSpec (`openspec/`): `specs/` holds the current capability specs (`csv-file-store`, `user-story-editor`), `changes/` holds proposals/archives. Use the `opsx:*` skills (propose / apply / archive). Commits use conventional-commit prefixes (`feat:`, `style:`, `chore(openspec):`).

The `review-backlog` skill (`.claude/skills/review-backlog/SKILL.md`) reviews a backlog CSV against `guidelines/product-backlog.md` (hierarchy, INVEST, acceptance criteria) and reports; it never edits the backlog CSV. Its suggestions are written to `reviews/<backlog>.csv` only through `.claude/skills/review-backlog/write-review.mjs` (validation and CSV logic in `src/user-story-generator/review.js`, shared with the portal's Apply/Dismiss). A long review is written in batches: the first run replaces the review, later runs add `--append` (each batch validated alone; `guard-bash.mjs` allows both forms). Statuses the user already decided are kept aside in `reviews/<backlog>.csv.decided` so later batches can restore them.

The repo is ESM (`"type": "module"` in `package.json`); `server.cjs` stays CommonJS, which is why it has the `.cjs` extension.

`guidelines/product-backlog.md` is the single source of backlog standards (epic/feature/story/AC definitions, the 13-point size cap, INVEST) used for both writing and reviewing stories; the review skill cites it and does not restate it. `src/user-story-generator/sprint-points-guideline.md` covers point sizing benchmarks.
