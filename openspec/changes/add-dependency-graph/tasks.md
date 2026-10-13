## 1. Layout

- [x] 1.1 Create `src/user-story-generator/graph.js` with `layoutGraph(stories)` (layers by longest path, barycentre ordering, unlinked/unresolved/cyclic reporting) and verify it with new `test/graph.test.mjs`
- [x] 1.2 Test chains, diamonds, several roots, unlinked and ID-less stories, a dangling reference, a self-reference and a cycle (finite layout, `cyclic` set); run `npm test` and confirm it passes
- [x] 1.3 Add a pure helper for the transitive dependency/dependent set of a story and cover it in `test/graph.test.mjs`

## 2. Tab and rendering

- [ ] 2.1 Add `'graph'` to the `view` values in `hooks/useBacklog.js` and a Graph tab button and panel in `App.jsx`; verify switching tabs shows and hides the panel
- [ ] 2.2 Create `components/GraphTab.jsx` rendering nodes and arrows as SVG from `layoutGraph`, with ID and truncated feature, epic colour, tooltip, and `issueClass` indicators; verify in the running app (`npm run dev`) against a backlog with dependencies
- [ ] 2.3 Add selection highlight (related nodes and edges prominent, others dimmed; click again or background clears) and verify in the app
- [ ] 2.4 Add Open in Editor (button for the selected node and double-click) plus Enter/Space selection on focused nodes; verify the Editor opens on that story
- [ ] 2.5 Render the "No dependencies" list, the empty-graph message, and notes for unresolved references and cycles; verify with a file that has a dangling ID and one with a cycle
- [ ] 2.6 Add node, edge, dimmed and layout styles to `tool.css`, checking light and dark appearance and a narrow window

## 3. Zoom and pan

- [x] 3.1 Add `fitView` and `zoomAt` (clamped zoom) to `graph.js` and cover them in `test/graph.test.mjs`; run `npm test`
- [ ] 3.2 Render the graph inside a transformed `<g>` in `GraphTab.jsx` with Ctrl+wheel/pinch zoom about the pointer, wheel pan and background-drag pan; verify in the app
- [ ] 3.3 Add zoom in/out/Fit buttons and keyboard +, −, 0 and arrow keys; reset to fit when the backlog changes; verify without a mouse
- [ ] 3.4 Verify link dragging, node selection and highlight still work correctly when zoomed and panned

## 4. Editing links

- [x] 4.1 Add `addDependency` / `removeDependency` actions in `hooks/useBacklog.js` (cycle and duplicate guarded via `wouldCycle`) and cover them in `test/reducer.test.mjs`; run `npm test`
- [ ] 4.2 Add drag-from-handle linking with a rubber-band line and Escape to cancel; verify in the app that dropping on a node adds the arrow and updates the Editor's Depends on list
- [ ] 4.3 Add the keyboard Link action and arrow selection with Delete/Remove; verify both without a mouse
- [ ] 4.4 Show a message for a rejected cycle, make linking available from the unlinked list, and mark ID-less stories unavailable; verify each in the app
- [ ] 4.5 Confirm an edit made in the graph is autosaved (CSV file contains the new `Depends On`)

## 5. Wrap-up

- [x] 5.1 Update README feature list if it describes the tabs, then run `npm test` and `npm run build` and confirm both succeed
