## Why

The Graph tab is hard to read on a real backlog. An arrow between stories more than one column apart is one curve drawn straight across the columns in between, so it runs through the boxes there. Unrelated dependency chains also share the same columns and interleave row by row, so you cannot tell which stories belong together.

## What Changes

- Linked stories are grouped into clusters (stories connected by dependencies, directly or through others). Each cluster is drawn in its own labelled band (`Cluster N · K stories`), and the bands are stacked vertically with a gap, largest first.
- An arrow that spans more than one column is routed through the space between the rows of the columns it crosses, so no arrow passes through a node.
- Stories within a column are ordered to reduce arrow crossings.
- The "No dependencies" list, selection highlighting, zoom and pan, and dependency editing are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: the Graph tab gains requirements for grouping linked stories into labelled clusters and for arrows that do not cross nodes. Existing graph requirements stay as they are.

## Impact

- `app/frontend/user-story-generator/graph.js`: `layoutGraph` returns clusters, positions and edge waypoints (pure, no DOM).
- `app/frontend/user-story-generator/components/GraphTab.jsx` and `tool.css`: draw the bands and the routed arrows; fit-to-view uses the new bounds.
- `test/graph.test.mjs`: new cases for clusters, routing and ordering; the existing cases keep passing.
- No data format, backend or dependency changes.
