## 1. Clusters in the layout (graph.js)

- [x] 1.1 Group linked stories into connected components, ordered by size (largest first, ties by first story's file position); give each node a `cluster` and return `clusters: [{ index, size, rows }]`. Verify with new tests in `test/graph.test.mjs`: two unrelated chains give two clusters, a link between them merges them, removing it splits them, and the order is 5, 3, 2.
- [x] 1.2 Lay out each cluster on its own so rows are per cluster. Verify with a test that no two nodes of different clusters share a row index within the same band, and that the existing layout tests still pass (`node --test test/graph.test.mjs`).

## 2. Routing past nodes (graph.js)

- [x] 2.1 Add a waypoint in every layer an edge skips (not for `back` edges) and give each edge `via: [{ layer, row }]`; waypoints take a row slot in their layer. Verify with a test: C depends on A with B in the layer between gives a waypoint whose row differs from B's.
- [x] 2.2 Order each layer by neighbour mean over a fixed number of left-right sweeps, nodes and waypoints together, keeping file order as the tie-break. Verify with a test on a graph that has a crossing-free order, that the result has no crossing, and that "rows follow the dependencies" and "roots share layer 0 in file order" still pass.

## 3. Drawing (GraphTab.jsx, tool.css)

- [x] 3.1 Position nodes by cluster band, row and layer; compute `bounds` from all bands; draw each band's tinted background and its `Cluster N · K stories` label in a reserved strip above its first row. Verify with `npm run build`, then in the browser with a backlog of two unrelated chains: two labelled bands, stacked, and Fit shows both.
- [x] 3.2 Draw edges as smooth paths through their waypoints (short edges keep the current curve); keep the wide hit path, markers and the `selected`, `dim` and `back` classes. Verify in the browser: no arrow passes through a node on a backlog with a skip-layer dependency, clicking an arrow selects it and Delete removes it.
- [x] 3.3 Check the existing behaviour still works with bands: node selection dims other bands' nodes and arrows, drag-to-link between two bands merges them, zoom/pan/fit and keyboard keys work, the "No dependencies" list is unchanged, a cycle still draws with its marked arrow. Verify by trying each in the browser.

## 4. Wrap-up

- [x] 4.1 Update the Graph description in `CLAUDE.md`/`README.md` if it mentions the layout, and run `npm test` and `npm run build` until both pass.
