## Context

The Graph tab (see proposal.md - Why) lays stories out with `layoutGraph` in `graph.js`: layer = 1 + the deepest dependency, `row` = position in the layer, ordered by the mean row of the dependencies in earlier layers. `GraphTab.jsx` turns `(layer, row)` into pixels (`pos`) and draws every edge as one cubic curve from the dependent's left edge to the dependency's right edge. Nothing is reserved for an edge in the layers it crosses, and all linked stories share one grid regardless of which chain they belong to.

`graph.js` is pure and unit-tested (`test/graph.test.mjs`); the component has no tests. Selection dimming (`relatedIds`), fit/zoom/pan, drag-to-link and edge selection all read `layout.nodes` and `layout.edges`.

## Goals / Non-Goals

**Goals:**
- Keep all new layout logic in `graph.js`, testable without a DOM.
- Keep the existing return fields (`nodes`, `edges`, `unlinked`, `unresolved`, `cyclic`) so the editing and highlight code keeps working.

**Non-Goals:**
- Exact crossing minimisation (NP-hard); a few ordering sweeps are enough for backlog-sized graphs.
- Routing cycle (`back`) edges around nodes.
- Changing the unlinked list, node content, colours or the editing gestures.

## Decisions

**1. Clusters via connected components, then one layout per cluster.** `layoutGraph` finds the connected components of the (undirected) dependency graph, orders them by size descending with ties by the file position of their first story, and lays out each one separately. Each node gets `cluster` (0-based), and the result gets `clusters: [{ index, size, rows }]` where `rows` is the cluster's height in rows. The component stacks bands by cumulative `rows` plus a gap and draws a label and tinted background per band.
Alternative: one global layout with extra spacing between groups. Rejected: rows are shared across layers, so a tall group still pushes unrelated nodes around, and there is no natural place for a label.

**2. Dummy waypoints per skipped layer.** For an edge whose endpoints are `d > 1` layers apart (and not `back`), insert one waypoint in each layer strictly between them. A waypoint occupies a row slot in that layer exactly like a node, so ordering and spacing treat it as an obstacle, and nodes end up above or below the lane. Each edge in the result gets `via: [{ layer, row }]`. Layers are processed with the waypoints included when computing rows.
Alternative: draw the long edge as a bigger bezier that bows above the graph. Rejected: it still needs to know where the free space is, which is the same bookkeeping, and it makes tall, unreadable arcs.

**3. Ordering by barycentre sweeps.** After the initial layering, order each layer by the mean row of its neighbours (nodes and waypoints), sweeping left to right then right to left, a fixed small number of times (4), keeping the file order as the tie-break so the result is deterministic. The existing "rows follow the dependencies" and "roots share layer 0 in file order" tests must still hold, so a layer with no neighbour information keeps file order.
Alternative: only the current one-pass ordering. Rejected: it only looks at earlier layers and cannot fix crossings caused by later ones.

**4. Edge drawing from waypoints.** `GraphTab` builds each path as a smooth curve through: the dependent's left-edge midpoint, one point per waypoint (centre of its slot, in the gap between layers), and the dependency's right-edge midpoint. Short edges (`via` empty) keep the current curve. The wide invisible hit path, markers and `selected`/`dim` classes are unchanged.
The gap between layers is already `GAP_X`; waypoints sit at the layer's x range so the curve passes through the free lane there.

**5. Bounds and fit.** `bounds` becomes the extent of all bands (width = widest cluster, height = sum of band heights and gaps). `fitView` is unchanged.

**6. Band label.** Text `Cluster N · K stories` (`1 story` for singular, though a cluster always has at least 2 stories). It is drawn at the top-left of the band, in a reserved strip above the first row, so it never overlaps nodes. The label is part of the SVG and is not interactive, so it does not interfere with panning by dragging the background.

## Risks / Trade-offs

- [Many waypoints make a layer taller] → Waypoints only appear for edges that skip layers; the lane is the price of not crossing a node. Fit-to-view keeps the whole graph visible.
- [Ordering is heuristic, not optimal] → Some crossings of arrows with each other may remain; arrow-through-node is still prevented because waypoints are obstacles. Tests assert the no-node-crossing property and one known crossing-free case.
- [Selecting a node dims other bands entirely] → That is the existing highlight behaviour and is helpful here, so it stays.
- [Layout results change for existing backlogs] → Positions only, and nothing is persisted from the layout.
