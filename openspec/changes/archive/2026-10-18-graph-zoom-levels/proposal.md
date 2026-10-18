## Why

The Graph tab draws every story-to-story dependency. On a real backlog that is dozens of arrows, and the question a team lead actually asks ("which features or epics depend on which?") has to be worked out by eye. The epic is only a colour stripe and the feature is not shown at all.

## What Changes

- The Graph tab gets a level switch: **Stories** (today's graph, unchanged), **Features** and **Epics**.
- At Features and Epics level each node is a feature (keyed by epic and feature) or an epic. One arrow joins two nodes when any story of one depends on any story of the other, labelled with the number of story links it stands for.
- Links between stories of the same group are not arrows; the node carries a count of them.
- Two groups that depend on each other are drawn and noted as such, without the "dependency cycle" error.
- Groups with no link to another group are listed under "No dependencies", as unlinked stories are.
- Features and Epics levels are read-only. Selecting a node or arrow lists the story links behind it, each opening the story or the Stories level.
- Zoom, pan, Fit, selection highlight and clusters work at every level.

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-story-editor`: adds requirements for the Features and Epics levels of the Graph tab (existing graph requirements keep describing the Stories level).

## Impact

- `app/frontend/user-story-generator/graph.js`: new pure grouping step in front of `layoutGraph`.
- `app/frontend/user-story-generator/components/GraphTab.jsx`: level switch, group nodes, read-only detail panel.
- `app/frontend/user-story-generator/tool.css`: group node styles.
- `test/`: a test file for the grouping step. No change to `core/`, the backend or the CSV files.
