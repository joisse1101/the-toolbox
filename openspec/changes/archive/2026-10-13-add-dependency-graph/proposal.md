## Why

Dependencies between stories are only visible as ID lists in the editor and the Stories table. A team lead planning a sprint cannot see the shape of the backlog at a glance: what blocks what, which stories are the roots, and which chains are long. A graph makes that readable.

## What Changes

- Add a third **Graph** tab next to Editor and Stories that draws and edits the open backlog's dependencies as a directed graph: one node per story, one arrow per `Depends On` link.
- Stories are laid out in layers so every arrow points the same way (a story sits to the right of everything it depends on).
- Nodes show the story ID and feature, are coloured by epic, and carry the same completeness indicators as the Stories table; clicking a node opens that story in the Editor.
- Selecting a node highlights its direct and transitive dependencies and dependents and dims the rest.
- Stories with no links are listed apart from the graph so they do not clutter it.
- Dangling references and cycles already present in a file are shown as warnings rather than breaking the view.
- - Links can be edited in the graph: drag from one node to another (or use a keyboard Link action) to add a dependency, and select an arrow to remove it. Cycles are rejected, as in the Editor.
- The graph can be zoomed (wheel/pinch, +/− buttons, fit-to-view) and panned (drag the background, or scroll), so large backlogs stay navigable.
- Rendered with plain SVG and a small pure layout function: no new dependencies.

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-story-editor`: adds a Graph tab and its behaviour (requirements are added, none changed).

## Impact

- New `src/user-story-generator/graph.js` (pure layout) and `components/GraphTab.jsx`; small edits to `App.jsx`, the view state and a dependency-editing action in `hooks/useBacklog.js`, and `tool.css`.
- New tests `test/graph.test.mjs`.
- No change to the CSV format, IDs, or the server.
- Builds on `add-story-ids-and-dependencies` (story `code` and `dependsOn`), which is already in the code but not yet archived.
