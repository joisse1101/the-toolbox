## 1. Tooling and moves

- [x] 1.1 Add `package.json` (react, react-dom, vite, @vitejs/plugin-react) with scripts `dev`, `build` and `test` (`node --test test/*.test.mjs`); commit the lockfile
- [x] 1.2 Add `vite.config.mjs` (`server.js` is CommonJS, so the package is not `type: module`): React plugin, multi-page inputs (launcher and user-story-generator), `/api` proxy to `127.0.0.1:3000`, output to `dist/`
- [x] 1.3 Add `node_modules/` and `dist/` to `.gitignore`
- [x] 1.4 Copy `csv.js`, `files.js`, `story-text.js` and `style.css` to `src/shared/`, and `model.js` to `src/user-story-generator/`, with no logic edits (copied rather than moved so the old app keeps running until 5.3 deletes `public/`)
- [x] 1.5 Update import paths in `test/*.test.mjs` and confirm `npm test` passes

## 2. Shell and file bar

- [x] 2.1 Port the launcher page (`src/main.jsx`) and the tool's `index.html` entry (`src/user-story-generator/`)
- [x] 2.2 Create the `useBacklog` reducer hook (files, current file, backlog, selection, view, checked set) using the existing `model.js` functions
- [x] 2.3 Create the `useAutosave` hook: debounce, single in-flight write, retry with backoff, flush on tab hide and before unload, status chip states
- [x] 2.4 Port the file bar: backlog dropdown, rename, New, Open folder, save status chip, message banner, empty-state prompt
- [x] 2.5 Port the shortcuts helper popover and the other info popovers

## 3. Editor tab

- [x] 3.1 Port the story list grouped by epic, with completeness indicators and selection
- [x] 3.2 Port the story form: epic, capability and feature suggestions, As a / I want / So that, sprint points selector with split warning, priority, notes, live preview
- [x] 3.3 Port the acceptance criteria editor (add, remove, Given/When/Then, raw-text fallback) and the unparseable-cell warnings
- [x] 3.4 Port add and delete story, selection movement, and all editor keyboard shortcuts
- [x] 3.5 Load the sprint points guideline via a `?raw` import

## 4. Stories tab

- [x] 4.1 Port the stories table (read-only, as the spec requires) with open-in-editor links
- [x] 4.2 Port multi-select (checkboxes, select all, shift-click ranges) and the bulk edit panel (priority, epic, capability)

## 5. Switch over and verify

- [x] 5.1 Point `server.js` at `dist/`, with a clear message when the build is missing
- [x] 5.2 Walk every scenario in `openspec/specs/user-story-editor/spec.md` and `openspec/specs/csv-file-store/spec.md` against the React app, using an existing backlog and a new one
- [x] 5.3 Delete the old `public/` app code
- [x] 5.4 Update the README: install, build, run, dev, tests, "Add a new tool"
- [x] 5.5 Run `npm test` and `npm run build`; start `node server.js` and confirm both pages load
