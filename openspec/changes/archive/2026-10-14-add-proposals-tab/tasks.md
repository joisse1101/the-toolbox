## 1. Store and loading

- [x] 1.1 Register `proposals` in `STORES` in `server.cjs`, add `proposals/*` to `.gitignore`, and document the folder in `README.md` and `CLAUDE.md`; verify `GET /api/proposals` (or the store list route) answers and a `../x.csv` name is rejected
- [x] 1.2 Add `loadBacklog(text, { placeholderIds: true })` in `model.js` that skips `renumber` and reports `changed: false`; add tests that the default is unchanged and that `NEW-3` codes and their `Depends On` survive a load/serialize round trip

## 2. Pure proposal logic

- [x] 2.1 Create `src/user-story-generator/proposals.js` with `nextPlaceholder(proposed, backlog)` (max over proposed codes and backlog `Depends On`/ambiguous entries, plus one) and tests, including a number still named only by the backlog not being reused
- [x] 2.2 Add `removeProposed(stories, id)` (remove and strip the code from other proposed stories, no renumber) and a proposals-only reorder; tests verify no ID changes
- [x] 2.3 Add `acceptProposed(backlogStories, proposedStories, ids, headers)` per design decision 3; tests cover: one story to the end of its Epic under a middle Feature (7 -> 8th), a new Epic at the end, file order kept for several, blank Epic refused with nothing moved, unknown columns kept, inputs not mutated
- [x] 2.4 Extend the `acceptProposed` tests for dependencies: link to a backlog story stays on the same story after renumber, links among stories accepted together are remapped, accepted-alone keeps `NEW-<n>` and a later accept rewrites it in the backlog, remaining proposals are re-pointed, a cycle is refused with nothing moved
- [x] 2.5 Change `backlogProblems` in `ids.js` so a missing `NEW-<n>` entry says it is still proposed; add a test and verify other missing entries keep the old message

## 3. Hooks

- [x] 3.1 Add a `replaceStories` action to the `useBacklog` reducer (marks the backlog edited so it autosaves) and a reducer test
- [x] 3.2 Create `hooks/useProposals.js`: load `proposals/<current>` on open and on tab focus, treat a missing file as an empty list and create it on the first save, expose stories, selection, edit/add/delete/reorder/`replaceStories`, and debounced autosave with retry through `useAutosave` parameterised with the `proposals` store; verify by reading `useAutosave` first and adding a reducer test for the pure part

## 4. UI

- [x] 4.1 Review `StoryList` and `StoryForm` for assumptions about derived IDs (grouping, epic commit, dependency choices) and list the required changes; then adapt them so they work for `NEW-<n>` stories, with `onCommitEpic` setting only `codedEpic` for proposals and `Depends On` choices drawn from backlog plus proposed stories
- [x] 4.2 Create `components/ProposedTab.jsx` (story list, form, Add, Delete, **Accept story**, **Accept all**, message area) and add the always-visible **Proposed (n)** tab to `App.jsx` (`Proposed (0)` and an empty list without a file; opening it writes nothing)
- [x] 4.3 Wire accept in `App.jsx`: compute `acceptProposed` from both hooks, on `{ error }` show the message and change nothing, otherwise `replaceStories` on the backlog first and on proposals second; verify manually with a backlog and a hand-made proposals file (placement, renumbering, dependency cases, both files saved, locked-file retry)

## 5. Verify

- [x] 5.1 Run `node --test test/*.test.mjs` and `npm run build` and verify both pass
- [x] 5.2 Run `openspec validate add-proposals-tab` and verify it passes
