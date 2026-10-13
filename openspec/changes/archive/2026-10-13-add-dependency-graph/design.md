## Context

See proposal.md - Why. Each story has a derived `code` (ID) and `dependsOn` (IDs it depends on); `ids.js` already has `backlogProblems`, `dependentsOf` and a reachability helper, and the Stories tab shows `issueClass`/`storyIssues` indicators. Tabs are driven by `view` in the `useBacklog` reducer (`'editor' | 'stories'`). The project has React and Vite only, and pure logic lives in plain modules covered by `node --test`.

## Goals / Non-Goals

**Goals:**
- A readable layered graph for backlogs of up to a few hundred stories, with no new dependency.
- Layout as a pure, tested function separate from rendering.

**Non-Goals:**
- Export to image, or persisting node positions.

## Decisions

- **Plain SVG, hand-written layout, no graph library.** A layered (Sugiyama-lite) layout is small: layer = longest path from a root (stories with no dependencies are layer 0), so a story is always right of its dependencies; order inside a layer by the average row of its dependencies, then by file order, to reduce crossings. Alternatives: dagre/elkjs (adds a dependency and bundle weight for a simple need), Mermaid (text-to-diagram, no click or highlight control).
- **`graph.js` exports `layoutGraph(stories)`** returning `{ nodes: [{id, code, layer, row}], edges: [{from, to}], unlinked, unresolved, cyclic }`. Pure, no DOM; pixel sizes are applied in the component. Edges point from dependent to dependency and are drawn with the arrowhead at the dependency.
- **Cycles are handled in layout, not prevented.** Layering runs a DFS that ignores back edges, so any file yields a finite layout; back edges are still drawn and the stories in them are marked via the existing `backlogProblems` warning. Alternative: refuse to draw a cyclic graph - rejected, since the point is to help find them.
- **Unlinked and ID-less stories** are excluded from the layout and listed beneath. This keeps the graph meaningful when most stories have no links.
- **Duplicate IDs (ambiguous codes)** are resolved by the first story holding the code, matching the "check that it points at the right story" warning already shown; no extra handling.
- **Highlight, link-mode and selected-arrow state is local to the Graph tab** (`useState`); zoom/pan is in the same place, not in the reducer; it need not survive tab switches. Related set = transitive closure over `dependsOn` and over `dependentsOf`.
- **Zoom and pan via an SVG `viewBox` transform, not CSS scroll.** View state `{x, y, k}` is local to the tab and applied as a `<g transform>`; the panel itself does not scroll. Wheel with Ctrl (and pinch, which browsers report as Ctrl+wheel) zooms about the pointer, plain wheel pans, background drag pans using pointer capture. `k` is clamped (about 0.2-3). Fit computes `k` and offset from the layout's bounds and runs on first show and on backlog change. Pure helpers `fitView(bounds, size)` and `zoomAt(view, point, factor)` live in `graph.js` and are unit tested. Pointer coordinates are converted through the current transform, so link dropping and the rubber-band line work at any zoom. Alternatives: native scrolling only (no zoom, cannot fit a large graph), a pan/zoom library (new dependency for ~60 lines).
- **Link editing reuses existing rules.** New reducer actions `addDependency(fromId, toCode)` / `removeDependency(fromId, toCode)` edit `dependsOn` through the same path as the Editor, so autosave and renumbering behave identically. Adding is guarded by `wouldCycle` and a duplicate check; a rejected link shows a message in the tab.
- **Gestures**: pointer drag from a small handle on each node to a target node (a rubber-band line follows the pointer; Escape cancels). Keyboard alternative: with a node selected, a Link button starts link mode and the next node chosen becomes the dependency. Arrows get wide invisible hit targets; Delete or a Remove button on the selected arrow removes it. Unlinked stories can be sources or targets too. Alternative: only a form-based "add link" control - rejected as slower than the gesture the graph invites.
- **Open in Editor** reuses `openInEditor` already used by the Stories tab.
- **Colour by epic** from a fixed palette indexed by epic order of first appearance, with the epic name in the node tooltip so colour is never the only signal. Indicators reuse `issueClass`.
- **Tab wiring**: add `'graph'` to `view`, a tab button, and a `GraphTab` panel with the same `hidden` pattern as the other tabs.

## Risks / Trade-offs

- [Large backlogs make a wide, tall graph] → Fit-to-view and zoom; unlinked stories are removed from it.
- [Edge crossings in dense graphs] → Barycentre ordering is a heuristic, not optimal; acceptable for an overview.
- [Long feature titles] → Truncate in the node, full text in the tooltip.
- [Colour palette and dark mode] → Use existing CSS variables where available and add node/edge classes to `tool.css`.

## Migration Plan

None; client-only, no file format change. Rollback is removing the tab.
