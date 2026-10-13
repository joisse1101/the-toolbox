## Why

The user story tool is about to gain a dependency graph where stories are dragged, linked and laid out on a canvas. The chosen graph library, React Flow, needs React, and the current UI (an 857-line `app.js` that rewrites the DOM by hand) is already awkward to extend. Migrating first, with no behavior change, means the story ID and dependency work that follows is written once, in its final framework, instead of in vanilla code that would be thrown away.

## What Changes

- Port the user story tool UI from hand-written DOM code to React components, with identical behavior, layout and keyboard shortcuts.
- Add a Vite build with the React plugin. Source moves out of `public/` into a source folder; `vite build` emits the static site that `server.js` serves.
- Add `package.json` with React and Vite dependencies and scripts for dev, build and test.
- Keep `server.js` and its CSV file API unchanged; it serves the built output instead of `public/` directly. In development, Vite serves the UI and proxies the file API to `server.js`.
- Keep the pure modules (`csv.js`, `story-text.js`, `model.js`) and their `node --test` suites unchanged; they are the regression safety net for the port.
- **BREAKING**: the project no longer runs with Node built-ins only. `npm install` and a build step are required before `node server.js`. README is updated accordingly.

## Capabilities

### New Capabilities
<!-- None. This is a behavior-preserving refactor. -->

### Modified Capabilities
<!-- None. No requirement in `user-story-editor` or `csv-file-store` changes; the specs are the acceptance criteria for the port. The change opts out of spec deltas with skip_specs. -->

## Impact

- **Code**: `public/user-story-generator/app.js` and its `index.html` are replaced by React components; `public/index.html` (launcher) and `public/shared/style.css`, `tool.css` move into the Vite source tree; `csv.js`, `files.js`, `story-text.js`, `model.js` move without edits.
- **Dependencies**: adds `react`, `react-dom`, `vite`, `@vitejs/plugin-react` (and a test-friendly setup that keeps `node --test` working).
- **Tooling/docs**: new `package.json`, `vite.config.js`, `.gitignore` entries for `node_modules/` and build output; README "Run", "Tests" and "Add a new tool" sections change.
- **Unaffected**: the CSV file format, the `user-stories/` data folder, the server's file API and its local-only binding.
