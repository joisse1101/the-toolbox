## 1. Pure collapse rules (`core/collapse.js`)

- [x] 1.1 Add `epicKey`, `featureKey` and `allKeys(groups)` (the key format moves here from `StoryList.jsx`)
- [x] 1.2 Add `anyOpen(closed, groups, level)` and `toggleLevel(closed, groups, level)`, counting hidden groups
- [x] 1.3 Add `reveal(closed, epic, feature)` (removes only those two keys, returns the same set when neither is closed) and `parseClosed` / `serializeClosed`, tolerating a missing or corrupt value
- [x] 1.4 Add `pruneClosed(closed, groups)`: drops keys of groups no longer present (an epic's feature keys go with it), returns the same set when nothing is stale
- [x] 1.5 Add `test/collapse.test.mjs`: level independence, the label rule with a hidden open feature, reveal leaving other keys alone, a blank epic or feature key, corrupt stored text, prune of a deleted feature and of a deleted epic, prune of an unchanged set returning the same set, an empty backlog dropping all keys

## 2. State hook and storage

- [x] 2.1 Add `hooks/useCollapsed.js` (`closed`, `toggleKey`, `toggleLevel`, `reveal`) storing under `tlt.collapsed.<backlog file>` with guarded `localStorage` access like `usePanelSizes.js`; reload the set when the file name changes
- [x] 2.2 Make the hook take the groups and a `ready` flag (a backlog is loaded and its file name equals the current file) and prune with `pruneClosed` when the groups change while `ready`, writing the result back; never prune while loading, switching files or after a failed read

## 3. Story panel

- [x] 3.1 Change `StoryList.jsx` to import the key builders from `core/collapse.js` and to use a `collapse` prop when given, keeping its local set otherwise (Proposed tab unchanged)
- [x] 3.2 Show the "Collapse/Expand epics" and "Collapse/Expand features" buttons in the panel header when `collapse` is given, with labels from `anyOpen`

## 4. Reveal rule in `App.jsx`

- [x] 4.1 Hold `useCollapsed` (current file, the groups of the stories, `ready`) and pass it to the Editor's `StoryList`
- [x] 4.2 Call `reveal` from `addStory` and, for each accepted story, from `accept`
- [x] 4.3 Add the effect that reveals the group when the selected story's trimmed epic or feature changes, skipping the first render and a change of file

## 5. Verify and document

- [x] 5.1 Run `npm test` and `npm run build`
- [x] 5.2 Check in the app: each spec scenario (bulk toggles, levels independent, reload, add story, accept, form edit, delete a feature, outside edit then refresh, file switch, Proposed tab unchanged)
- [x] 5.3 Add a line to `CLAUDE.md` for `useCollapsed.js`, `core/collapse.js` and the `tlt.collapsed.<backlog file>` key
