## Context

`StoryList.jsx` keeps the folded groups in a local `closed` set of keys (`e:<epic>` and `f:<epic>\n<feature>`, from `epicKey` and `featureKey`). Everything starts open and nothing is stored. The Editor tab and the Proposed tab both render `StoryList`. `groupByEpic` in `core/model.js` gives the two levels (epic, then feature). A blank Epic or Feature becomes a group with the key part `''`, labelled "(No epic)" / "(No feature)".

`usePanelSizes.js` already stores UI state in `localStorage` with guarded reads and writes, and `core/panel-size.js` holds its pure rules. The repo tests only pure modules (`test/*.test.mjs`).

"Add story" creates a blank story (`newStory`), so it lands in `(No epic) > (No feature)`. Accepting from the Proposed tab goes through `accept()` in `App.jsx`, whose result lists `accepted` stories with their epic and feature.

## Goals / Non-Goals

**Goals:**
- One source of truth for the folded keys that `App` can reach (to call `reveal`) and `StoryList` can render.
- The key and toggle rules live in `core/` as pure functions with tests.

**Non-Goals:**
- No change to the Proposed tab's list, the CSV, the backend or story ordering.
- No syncing of folded state between browsers or devices.

## Decisions

**1. A `closed` set, stored as an array of keys.** Storing closed keys, not open ones, makes a new or renamed group open by default, as the spec requires, with no migration. Alternative: store the open keys. Rejected, because every new group would then start closed.

**2. Names, not IDs, in the keys.** IDs are derived and shift on every renumber, so an ID-keyed fold would jump to other stories. The existing keys already use names. A rename opens the group, which is acceptable.

**3. Pure helpers in `core/collapse.js`.** The helpers are `epicKey`, `featureKey`, `allKeys(groups)` (epic keys and feature keys), `toggleLevel(closed, groups, level)` (closes every key of that level if any is open, else opens them all), `anyOpen(closed, groups, level)`, `reveal(closed, epic, feature)`, and `parseClosed(raw)` / `serializeClosed(set)`. `StoryList` imports the key builders from there, so key format is defined once. `toggleLevel` and `anyOpen` count all groups of the level, hidden ones included, which is what the button label rule needs.

**4. `useCollapsed(backlogFile)` holds the state in `App`.** It returns `closed`, `toggleKey(key)`, `toggleLevel(level)`, `reveal(epic, feature)`. It follows `usePanelSizes`: guarded `localStorage` reads and writes under `tlt.collapsed.<backlog file>`, and a plain in-memory set when the store fails. The state is read when the file name changes. It is written on each change. A corrupt stored value parses to an empty set. The hook needs the current groups only for `toggleLevel`, so it takes them as an argument to that call and does not copy the stories into state.

**4a. Stale keys are pruned, but only when the backlog is ready.** `pruneClosed(closed, groups)` in `core/collapse.js` drops every key whose group is not in `groupByEpic(stories)` and returns the same set when nothing is stale (no write, no re-render). `useCollapsed` takes the groups and a `ready` flag and prunes whenever the groups change while `ready` is true; the result is written back to the browser store. `ready` means a backlog is loaded and its file name equals the current file, so an empty list during loading, the old file's stories under the new file's key during a switch, and a failed or missing file never prune. A backlog that really became empty is ready, so its keys go. This covers a delete and a finished refresh (the tab-focus re-read) with one effect. A rename is not migrated: the panel cannot tell it from a delete plus an add (the form edits one story at a time), so the old key is pruned and the new name starts expanded. Carrying state across the bulk edit was considered and left out: a second code path for state that is cheap to redo. Alternative: never prune. Rejected now that the `ready` gate removes the loading risk.

**5. `StoryList` takes the state as props, opt-in.** With a `collapse` prop (the hook's value) it uses it and shows the two buttons. Without it, it keeps a local set exactly as today, so the Proposed tab does not change and is not stored. Alternative: always require the prop and give the Proposed tab its own hook instance. Rejected, because it would add a storage key and buttons nobody asked for.

**6. Reveal rule, three triggers in `App`.**
- `addStory`: call `reveal('', '')` for the blank story.
- `accept`: call `reveal(story.epic, story.feature)` for each accepted story, with the names trimmed the way `groupByEpic` trims them.
- Selected story's epic or feature changed: an effect on the selected story's trimmed `epic` and `feature` calls `reveal`. It compares the same story (same file and ID) before and after, so it does not run on a plain selection change: clicking a visible row needs no reveal, and a load or refresh, which selects a story by itself, would otherwise reopen the group you had folded. Opening a story from another tab ("open in editor") therefore does not reveal it; that is how single-group folding already behaves.

`reveal` removes the one feature key and its epic key from the set and nothing else, and does nothing (no write) when neither key is in the set.

**7. Buttons sit in the panel header row** next to the heading, in the small panel font, as plain buttons with `aria-pressed` left out (the label already states the action). Colors and spacing come from the existing CSS variables in `tool.css`.

## Risks / Trade-offs

- [Pruning could erase state while the list is still loading or switching files] → Prune only when `ready` (decision 4a).
- [Dragging the last story out of a feature and back loses that feature's folded state, and it returns expanded] → Accepted: folding is cheap to redo.
- [The reveal effect could fire on first load and open a group the user had closed] → The effect compares against the previous epic and feature of the same story, and skips the first render and any change of file.
- [Two browser tabs write the same key] → The last write wins. This is a convenience state, so that is accepted.
- [A group both Epic-collapsed and Feature-collapsed shows no sign of the inner state] → The head's count and arrow are unchanged. Reopening the epic shows the features as they were, which the spec requires.
