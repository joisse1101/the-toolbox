# Design

## Context

See proposal.md for why. Today's layout:

```
planner/
  package.json  package-lock.json  node_modules/  planner.config.example.yaml
  guidelines/            3 markdown files (skills copy them; the portal shows one)
  logic/                 backlog/ lexicon/ review/ storage/ skill-support/
  portal/
    server/server.cjs    API + static files from ../dist
    start.mjs            build if stale, start server (+ Vite in --dev), open browser
    web/                 vite.config.mjs, index.html, main.jsx, lib/, shared/, backlog-portal/
    dist/                build output (git-ignored)
  scripts/sync-skill-logic.mjs
  test/                  logic/ portal/ helpers/ sample-data/ setup.mjs sample-config.yaml
  data/                  git-ignored
```

The server and its storage modules are CommonJS (`.cjs`), so ES-module skill scripts can share them. `planner/test/zones.test.mjs` enforces which folder may import which.

## Goals / Non-Goals

**Goals:**

- Every file has one obvious home: server, browser, or shared with the skills.
- The move shows up in git as renames, so `git log --follow` keeps each file's history.

**Non-Goals:**

- Single-page app, router and feature folders. These come in `viewer-single-page-app`.
- TypeScript. This comes in `viewer-typescript`.
- Renaming the browser's `localStorage` keys (`planner.listWidth` and others). A rename would drop every saved panel width for no gain.
- Rewriting archived changes, or the example folder name `D:\planner-data` in the specs.

## Decisions

### Target layout

```
viewer/
  package.json  package-lock.json  node_modules/
  viewer.config.example.yaml       viewer.config.yaml (git-ignored)
  data/                            git-ignored default data folder
  backend/
    server.cjs
    storage/   backlog-files.cjs  project-config.cjs  project-folders.cjs  paths.cjs  starting-files.js
  frontend/
    vite.config.mjs  index.html  backlog-portal/index.html
    src/       main.jsx  lib/  shared/  backlog-portal/   (today's portal/web/ minus the html and config)
    dist/      git-ignored
  shared/
    backlog/  lexicon/  review/  skill-support/
    storage/  backlog-paths.cjs  backlog-initials.cjs  file-name.cjs
    guidelines/
  scripts/   start.mjs  sync-skill-logic.mjs
  test/
    shared/    today's test/logic/
    backend/   today's test/portal/server-*.test.mjs
    frontend/  the rest of today's test/portal/
    helpers/  sample-data/  sample-config.yaml  setup.mjs  zones.test.mjs  skill-sync.test.mjs
```

A module goes to `backend/` when only the server imports it, directly or through another server-only module. Today that holds for `backlog-files`, `project-config`, `project-folders`, `storage/paths` and `backlog/starting-files`. Everything the browser or a skill copy imports stays in `shared/`. Before the move, re-run the import check (`grep` for each module's name) in case a recent commit changed it.

`frontend/` is Vite's root, so both HTML files sit in it and point into `src/`. The second page, `backlog-portal/index.html`, stays until the single-page change removes it.

`start.mjs` moves to `scripts/` because it drives both the backend and the frontend. The npm scripts change with it.

The alternative was `shared/` holding all of `logic/` as is, which is a smaller diff. We rejected it because server-only code in `shared/` hides which code the skills depend on. The sync script's `SKILLS` map would also keep pointing into a folder that half belongs to the server.

### Zone rule

`zones.test.mjs` becomes:

- `viewer/shared` may import only `viewer/shared`.
- `viewer/backend` may import `viewer/backend` and `viewer/shared`.
- `viewer/frontend` may import `viewer/frontend` and `viewer/shared` (the guidelines included).
- `toolkit` may import only `toolkit`.

Backend and frontend never import each other. The coverage test checks that `viewer/shared`, `viewer/backend`, `viewer/frontend` and `viewer/shared/skill-support` all have source files.

### Config and data names

The config file becomes `viewer/viewer.config.yaml`, its variable becomes `VIEWER_CONFIG`, and the default data folder becomes `viewer/data/`. The skills no longer read the config (see the archived `skills-read-only-plans`), so this rename affects only the viewer.

We chose not to keep reading `PLANNER_CONFIG` as a fallback, because one user is affected and the wiki gives the one-line fix. A fallback would stay in the code long after anyone needs it.

### How to move

Use `git mv` for every tracked file. Commit the moves alone first, then the path fixes, so git pairs each old file with its new one. A file that is moved and edited heavily in one commit may lose its rename pairing.

Git-ignored files (`planner/data/`, `planner/planner.config.yaml`, `planner/node_modules/`, `planner/portal/dist/`) do not move with `git mv`. The implementer leaves them alone: they are the user's real data, and this worktree has none. The wiki's Viewer Guide gets a short "Moving from planner/" section with the steps from the proposal's Impact list.

### Docs

`wiki/planner/` becomes `wiki/viewer/` and `Planner-Guide.md` becomes `Viewer-Guide.md`. The sidebar, the Home page and every link change with them. `python scripts/check_docs.py` catches a broken link or path.

The Purpose line of each main spec that says "planner portal" (`portal-accessibility`, `portal-safe-actions`, `portal-visual-system`, `project-config`, `project-switcher`, `project-wiki`, `backlog-guidelines`) is edited directly in `openspec/specs/`, because a delta cannot change a Purpose.

## Risks / Trade-offs

- [The user's main checkout keeps an untracked `planner/` folder after pulling] → The Viewer Guide's migration section lists what to move and says the old folder can then be deleted.
- [A generated skill copy keeps a stale "source:" header] → The sync test (`skill-sync.test.mjs`) fails until the copies are regenerated, so the regeneration cannot be forgotten.
- [Dependabot watches `/planner`] → Change `.github/dependabot.yml` to `/viewer` in the same commit as the `package.json` move.
- [The requirement "Nothing in the toolkit imports the planner" keeps "planner" in its name] → Its body now says `viewer/`. The name stays because renaming a requirement needs its own delta operation and adds nothing.

## Migration Plan

1. Merge the change.
2. In the main checkout, the user moves the config and the data, runs `npm install` in `viewer/` and deletes `planner/`, as the Viewer Guide says.

To roll back, revert the commits. The user's moved files then need moving back by hand.
