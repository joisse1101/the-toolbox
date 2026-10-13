## 1. ID and dependency rules

- [x] 1.1 Add `src/user-story-generator/ids.js` with `epicPrefix` and `renumber(stories)` (prefix collision lengthening, per-epic position numbers, no code for a blank epic, reference rewriting through an old-to-new map); verify with `test/ids.test.mjs` cases for `IAM`, `DD`/`DDI`, `&` and punctuation, a blank epic, swapped stories keeping links, ambiguous old codes left alone, and no-op returning the same objects
- [x] 1.2 Add `moveStory` (same-epic reorder inside the epic's own array slots; cross-epic insert before a story or after the group's last; drop on a blank epic is a no-op) and verify with tests that other epics' rows and group order do not move
- [x] 1.3 Add `removeStory`, `dependentsOf`, `wouldCycle` and `backlogProblems` (dangling, self, cycle, ambiguous) and verify with tests for each case, including indirect cycles and reference stripping on delete

## 2. Model and CSV

- [x] 2.1 Add `ID` and `Depends On` to `COLUMNS`, add `code`, `dependsOn` to `newStory`/`storyFromCells`, write them in `serializeBacklog`, and renumber in `loadBacklog` reporting whether anything changed; verify with tests for a round trip, an old file gaining both columns with its column order kept, unknown columns untouched, and rows reordered outside the tool
- [x] 2.2 Feed `backlogProblems` into `storyIssues` as warnings and verify with tests that each problem gives a warning and no error

## 3. State

- [x] 3.1 Export the reducer and make `add`, `delete` and `bulk` end in `renumber` (bulk moves epic-changed stories to the bottom of the new epic in their previous order); verify with reducer tests, including that unchanged state does not bump `edits`
- [x] 3.2 Add `commitEpic` and `moveStory` actions; verify with reducer tests that a no-op commit and a drop at the same position bump nothing, and that the dragged story stays selected
- [x] 3.3 Mark the backlog dirty when load changed any code; verify by opening an old CSV and seeing it saved with the new columns, and add `previewBulk` for the confirmation text, verified by a test that its count equals the stories renumbered

## 4. Interface

- [x] 4.1 Show the read-only ID on `StoryForm` (with the "assigned once an Epic is set" hint when blank) and call `commitEpic` on Epic blur and datalist choice; verify in the browser that typing does not change the ID and leaving the field does
- [x] 4.2 Add drag and drop to `StoryList` (draggable rows, drop indicator, header drops, no drops on "(No epic)") and show the ID in each row; verify in the browser: reorder within an epic, drag to another epic, drop at top and bottom, the CSV on disk changes accordingly
- [x] 4.3 Add the "Depends on" picker (chips with link and remove, datalist excluding self, existing links and cycle-forming stories) and the read-only "Required by" list; verify in the browser including a refused cycle, links surviving a reorder, and opening a linked story
- [x] 4.4 Add ID and Depends On columns to `StoriesTab` and the new-ID line to the bulk confirmation; verify in the browser with a bulk epic move
- [x] 4.5 Show the dependency warnings on the form, list tooltips and table rows; verify with a hand-edited CSV containing a dangling entry, a cycle and an ambiguous reference

## 5. Finish

- [x] 5.1 Update `README.md` for the `ID` and `Depends On` columns, the position-based ID rule and drag and drop, then run `npm test` and `npm run build` and verify both succeed
