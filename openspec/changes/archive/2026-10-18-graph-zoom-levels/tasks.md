## 1. Grouping logic

- [x] 1.1 Add `groupStories(stories, level)` to `graph.js` (group keys, `dependsOn` between groups, story counts, internal link counts, story pairs per group edge, exclusion of stories lacking ID/Epic/Feature) and verify with new tests in `test/graph-groups.test.mjs` covering: same feature name in two epics, arrow weight, internal links, excluded stories, epics level
- [x] 1.2 Add mutual-dependency detection (A->B and B->A, and longer group cycles) and verify with tests that a story-acyclic backlog yields a mutual pair and no story-level cycle flag
- [x] 1.3 Run `npm test` and verify the existing graph tests still pass

## 2. Graph tab

- [x] 2.1 Add the Stories | Features | Epics control and `level` state to `GraphTab.jsx` (reset to Stories on a new backlog, re-fit on change, kept across edits) and verify in the browser
- [x] 2.2 Render group nodes (name, epic hue at Features level, story count, internal-link badge) and weighted arrows through the existing layout, and verify on a backlog with several epics that zoom, pan, Fit and bands work
- [x] 2.3 Show the mutual-dependency note instead of the cycle note at coarse levels, and verify the Stories level still shows the cycle note for a real cycle
- [x] 2.4 List groups without cross-group links under "No dependencies" and verify the counts
- [x] 2.5 Hide link handles and disable Link and Remove dependency at coarse levels, and verify no dependency can be changed there

## 3. Inspecting links

- [x] 3.1 Selecting a group or arrow lists the underlying story links, each opening the story in the Editor; verify by clicking one
- [x] 3.2 Add "Show stories", which switches to the Stories level with the group's or link's stories highlighted, and verify the dimming
- [x] 3.3 Highlight related groups on selecting a group node and verify against a known chain

## 4. Styles and docs

- [x] 4.1 Add group node, weight label and level control styles in `tool.css`, and verify in light and dark themes if the tool has both
- [x] 4.2 Update the `graph.js` mention in the frontend paragraph of `CLAUDE.md`, and verify `npm run build` and `npm test` pass
