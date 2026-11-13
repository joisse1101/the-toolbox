# Design

## Context

This design assumes the layout from `rename-planner-to-viewer`. The frontend there is `viewer/frontend/`, with two HTML entries: `index.html` (the launcher) and `backlog-portal/index.html`. The backlog tool's open tab is `view` in the `useBacklog` reducer. Its values are `editor`, `stories`, `graph`, `proposed`, `lexicon`, `review` and `settings`. `actions.setView` changes it, from the tab bar, the arrow keys, the Settings switch and `useReviewFlow` (which leaves Review when the file goes away).

The server's static handler sends a file from `dist/`, redirects a folder to its trailing-slash form, and answers 404 otherwise.

See proposal.md for why.

## Goals / Non-Goals

**Goals:**

- The address is the only record of the open tool and tab.
- A file's folder says which tool and feature it belongs to, and a test keeps it that way.

**Non-Goals:**

- The open story or the open backlog in the address. Both can be added later as path parts, without changing this structure.
- DOM or React tests. The repo tests pure modules only, so the routing rules are written as pure functions.
- Renaming `localStorage` keys.

## Decisions

### React Router in declarative mode

Use the `react-router` package (version 7) with `<BrowserRouter>` and `<Routes>`. Pin the exact version at install. We don't use its data mode or framework mode: the app loads its data through its own hooks, and framework mode would replace Vite's plain setup.

A hand-written router was the alternative. We rejected it: tabs as nested routes, history and links are exactly what the library already does well.

Routes:

```
/                    HomePage
/backlog             -> redirect (replace) to /backlog/editor
/backlog/:tab        BacklogTool
/backlog-portal/*    -> redirect (replace) to /backlog
*                    NotFoundPage
```

### The address replaces the reducer's `view`

`view` and its `'view'` action leave the `useBacklog` reducer. A hook, `useTab()`, reads `:tab` and returns the tab to show and a `setTab(tab, { replace })` that navigates. The calls to `actions.setView` move to `setTab`. Two of them are fallbacks that must not add a history entry, so they pass `replace`: the switch to `settings` after a project switch, and leaving Review.

The tab to show comes from a pure function, `resolveTab(requested, { hasBacklog, hasReview })`:

- It returns `settings` when no backlog is open.
- It returns `editor` for `review` when there is no review file.
- It returns `null` for an unknown tab.

A `null` sends `BacklogTool` to the Not Found page. When the result differs from the address, the address is replaced. This one function holds every rule in the spec's "An unavailable tab falls back" requirement, and it can be tested without a browser.

### Server fallback

A pure function, `staticTarget(pathname)`, sorts a request path into one of three kinds:

- `api`: the path starts with `/api/`.
- `file`: the last segment has an extension.
- `app`: anything else.

`handleStatic` serves a `file` path from `dist/` or answers 404. It serves `dist/index.html` for an `app` path. The trailing-slash redirect for folders goes away, because no page lives in a folder any more.

`/api/` paths never reach `handleStatic`, as today. The function still names them, so the test covers the rule in the spec.

Vite's dev server already falls back to `index.html` (its default `appType: 'spa'`), and `base` stays `/`, so built asset links are absolute and load from any address.

### Folder layout

```
frontend/
  index.html  vite.config.mjs
  src/
    main.jsx                         router root, ConfirmProvider
    app/        routes.jsx  HomePage.jsx  NotFoundPage.jsx
    shared/                          any tool may use these
      ui/       ConfirmDialog EmptyState Info FormParts Layout ResizeHandle StateMark TabHeader
      hooks/    useConfirm useCollapsed usePanelSizes useListWidth useAutosave
      lib/      collapse panel-size word-diff
      api/      files.js
      style.css
    tools/
      backlog/
        BacklogTool.jsx  backlog.css  tabs.js (resolveTab, the tab list)
        shell/     FileBar AddProjectDialog useBacklog useProjects useShortcuts shortcuts.js useTab
        shared/    story-form/ (StoryForm StoryHeader *Section StoryFitSections fieldCues storyFormNav)
                   StoryList Suggestions issues
        features/
          editor/    EditorTab.jsx (StoryList + StoryForm, extracted from today's App.jsx)
          stories/   StoriesTab StoriesTable StoriesFilters StoriesBulkBar storiesColumns story-table.js
          graph/     GraphTab GraphCanvas GraphDetail GraphToolbar GraphUnlinked graphGeometry graph.js
          review/    ReviewTab useReview useReviewFlow
          proposed/  ProposedTab useProposals useProposedFlow
          lexicon/   LexiconTab useLexicon useLexiconSuggestions
          settings/  SettingsTab useSettings
```

The placement follows today's imports. Code that one feature uses lives in that feature's folder. Code that two or more backlog features use lives in `tools/backlog/shared/`; for example, the Editor and Proposed tabs both use `StoryForm`. Code with nothing backlog-specific lives in `src/shared/`. A feature folder holds its own hooks, so `hooks/` and `components/` disappear.

Features never import each other, because then a tab could not be moved or removed alone. Before moving, re-run the import map (which file imports which) in case a recent commit changed a placement.

### Frontend zones in the zones test

`zones.test.mjs` gains three rules inside `viewer/frontend/src`:

- `shared/` imports nothing under `tools/` or `app/`.
- A file in `tools/<tool>/` imports nothing under another tool.
- A file in `tools/<tool>/features/<feature>/` imports nothing under another feature.

`app/` may import tools, because it mounts them.

### Order of work

Move the files into the feature folders with `git mv` first, fixing only the imports. Then add the router. Kept apart, the rename commit stays a pure move, and the router commit shows only behaviour changes.

## Risks / Trade-offs

- [A code path still calls the removed `actions.setView`] → Remove the action from the reducer, so a leftover call throws at once in the browser. Also `grep` for `setView` before the router commit.
- [The Settings switch reloads the page (`window.location.reload()`) and expects to land on Settings] → The address now holds `/backlog/settings`, so the reload lands there without the old "switched" flag. Keep the flag only for the note it shows.
- [An asset link breaks under a nested address such as `/backlog/graph`] → Vite builds absolute `/assets/` links with `base: '/'`. Task 3.3 checks a reload on a nested address in the built app.
- [Features may need each other later] → Move the shared part to `tools/backlog/shared/` when that happens. The zones test points out the import that breaks the rule.

## Migration Plan

Nothing to migrate. Old `/backlog-portal/` bookmarks redirect.
