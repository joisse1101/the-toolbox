## Context

The tool is a static multi-page site: `public/index.html` (launcher) and `public/user-story-generator/` (one `index.html` plus `app.js`, 857 lines of imperative DOM code driven by a module-level `state` object). `server.js` serves `public/` and a CSV file API under `/api/<store>/`, using Node built-ins only. The pure modules `csv.js`, `story-text.js` and `model.js` have `node --test` suites in `test/` that import them from `../public/...`. See proposal.md for why the migration is happening now.

The existing `user-story-editor` and `csv-file-store` specs describe the behavior the port must preserve; they are the acceptance criteria.

## Goals / Non-Goals

**Goals:**
- Same behavior, layout, shortcuts and file format as today, rendered by React.
- `node server.js` remains the one command to use the app, after a one-time `npm install` and `npm run build`.
- Existing unit tests keep passing with only import-path changes.

**Non-Goals:**
- No new features, no visual redesign, no change to the CSV format or the file API.
- No TypeScript, router, state-management library or UI kit.
- No story IDs, dependencies or graph (separate, later changes).

## Decisions

**Vite + React, plain JavaScript.** Vite gives a fast dev server and a static build with no config beyond the React plugin. Plain JS matches the existing code; adding TypeScript would double the size of the diff. Alternative: esbuild only, rejected because the dev server, proxy and hot reload would have to be hand-rolled.

**Source tree moves to `src/`; `public/` is no longer the app.** Vite's convention is that `public/` is for untouched static assets, so keeping source there would be confusing. New layout:

```
src/
  index.html, main.jsx            launcher entry
  user-story-generator/           one folder per tool, so its URL stays /user-story-generator/
    index.html, main.jsx, App.jsx, components/, hooks/
    model.js                      moved unchanged
  shared/
    csv.js, files.js, story-text.js, style.css   moved unchanged
dist/                             vite build output, served by server.js, git-ignored
```

A multi-page build with two entries (launcher and the tool) keeps the existing URLs `/` and `/user-story-generator/`; Vite emits each page at its path relative to `src/`, which is why the tool lives directly under `src/` rather than in a `tools/` folder. Alternative: a single-page app with a router, rejected as unnecessary for two pages.

**`server.js` serves `dist/` instead of `public/`; the API is unchanged.** Only the `PUBLIC_DIR` constant and a missing-build message change. Vite's dev server proxies `/api` to the Node server, so there is one file API implementation. Alternative: embed the API as a Vite plugin, rejected because it would fork the production and development code paths.

**State: one `useReducer` store plus a few hooks, not per-component state.** Today's `state` object, the auto-save machine (debounce, in-flight write, retry with backoff, flush on tab hide and unload) and the backlog's story list are tightly coupled. They move into a `useBacklog` hook with a reducer; the save machine becomes a `useAutosave` hook using refs for timers and the in-flight promise. Components are mostly presentational. Alternative: Redux or Zustand, rejected as an extra dependency for one screen.

**Keep `model.js` signatures stable.** Story objects are mutated in place by the form handlers today. The reducer will clone the story being edited and replace it in the array so React sees a new reference; the `model.js` function signatures stay the same so its tests are unaffected.

**Keyboard shortcuts and grid navigation stay imperative inside components.** Arrow-key row navigation in the Stories tab and document-level shortcut handling are ported as `useEffect` listeners, not rewritten as React synthetic-event logic, to minimize behavior drift.

**Tests stay on `node --test`.** Only the import paths in `test/*.test.mjs` change. No component-test framework is added in this change; the port is verified manually against the spec scenarios plus the unchanged unit tests. Alternative: Vitest with Testing Library, deferred until there is logic worth covering that way (the ID and dependency changes).

**Sprint points guideline** (`sprint-points-guideline.md`) is imported with Vite's `?raw` suffix instead of fetched at runtime.

## Risks / Trade-offs

- [Subtle behavior drift in auto-save, selection or focus handling] -> Port the save machine first, in isolation, against the spec's auto-save scenarios; compare with the running old app side by side before deleting it.
- [Controlled inputs plus a debounced save can lose keystrokes or move the cursor] -> Edit handlers update the reducer synchronously; only the disk write is debounced.
- [The build step is a new failure mode: stale or missing `dist/`] -> `server.js` prints a clear "run `npm run build`" message when `dist/` is absent; the README documents the flow.
- [Large diff, hard to review] -> Port in stages (tooling, shell and file bar, editor tab, Stories tab) and keep the old app working until the last stage, then delete it in one commit.
- [Loss of "no dependencies" simplicity] -> Accepted; required for React Flow later.

## Migration Plan

1. Add tooling (`package.json`, `vite.config.js`, `.gitignore`), move the pure modules and tests, and confirm tests pass.
2. Port the tool in stages while the old `public/` app still runs.
3. Switch `server.js` to `dist/`, delete the old `public/` app, update the README.
4. Rollback: revert the merge. Data files are untouched because the CSV format and the `user-stories/` folder do not change.

## Open Questions

- Whether to commit `package-lock.json` (assumed yes, for reproducible installs).
