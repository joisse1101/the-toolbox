## Context

See proposal.md for why. What the code does today (observed):

- `loadBacklog` (`model.js`) always runs `renumber`, which recomputes every story `code` from `codedEpic` and position and rewrites `dependsOn` for any entry that equals a unique old code. A story without an epic gets code `''`.
- The reducer in `hooks/useBacklog.js` is bound to the `user-stories` store and the file list; move, delete and epic commit call `moveStory`/`removeStory`/`commitEpic`, all of which end in `renumber`.
- `moveStory(stories, id, epic, null)` already places a story after the last story of that epic (or at the end of the array if the epic is new), regardless of Feature.
- `renumber` keeps `dependsOn` entries it does not recognise ("unknown entries stay") and remaps entries that match a story's old code, across all stories.
- `applySuggestions` (`review.js`) shows the pattern for composing pure edits from `commitEpics` + `renumber` and returning `{ stories }` or `{ error }`.
- `useReview` shows the pattern for a second, file-per-backlog store with its own debounce and retry.
- `StoryList`/`StoryForm` take `stories`, `problems` and callbacks as props; `StoryForm` offers `Depends On` choices from the `stories` prop via `dependencyChoices`.
- `user-stories/*` and `reviews/*` are git-ignored.

## Goals / Non-Goals

**Goals:**
- A proposals file that can be edited in the portal and accepted into the backlog without breaking derived IDs or dependency links.
- Reuse `renumber` and the existing components rather than a parallel implementation.

**Non-Goals:**
- Skills, CLI scripts or anything that writes proposals outside the portal (follow-up change `add-write-story-skills`).
- Stories/Graph/Review tabs for proposals.
- Atomic two-file commits.

## Decisions

**1. Proposals are loaded and saved without `renumber`.** `loadBacklog(text, { placeholderIds: true })` skips the final `renumber` and reports `changed: false`; `serializeBacklog` is already generic. A new reducer for proposals never calls `renumber`/`moveStory`/`removeStory`. Alternative considered: give the proposals file derived IDs like a backlog; rejected because they would collide with real backlog IDs in `Depends On`.

**2. A small pure module `proposals.js` owns all proposal logic.**
- `nextPlaceholder(proposed, backlog)`: `max(n)+1` over `NEW-<n>` in the proposals' codes and in every backlog `dependsOn`/`ambiguous` entry. Needs no stored counter and guarantees no reuse while anything refers to a number.
- `removeProposed(stories, id)`: remove and strip that code from other proposed stories' `dependsOn` (no renumber).
- `acceptProposed(backlogStories, proposedStories, ids, headers)` returns `{ backlog, proposals, accepted }` or `{ error }`; pure, never mutates inputs.

**3. Accept reuses `renumber` for all remapping.** Steps in `acceptProposed`:
1. Take the selected proposed stories in file order. Error if any has a blank epic.
2. Give each a backlog-shaped copy: `epic` trimmed, `codedEpic` = `''`, `code` left as its `NEW-<n>`, `cells` padded to the backlog's headers.
3. Insert each copy by array position, after the last story of the same epic (end of the array if the epic is new), with `codedEpic` already set to the epic. This is the placement `moveStory(..., null)` gives, but done without calling it per story, because `moveStory` renumbers on every call. `renumber` then runs once for the whole batch.
4. `renumber` assigns each its derived code and rewrites every `dependsOn` entry that equals a placeholder now held by a story: links among the accepted stories, and links from stories accepted earlier that still named `NEW-<n>`. A placeholder still unaccepted is an unknown entry and stays.
5. Build a `NEW-<n> -> new code` map from the internal ids, then rewrite the remaining proposed stories' `dependsOn` through it.
6. If the result contains a new dependency cycle (checked with `backlogProblems`), return `{ error }`.
The first point means the "accepted one at a time" case needs no special handling: the earlier-accepted story keeps `NEW-1` in its `dependsOn`, and the later accept of `NEW-1` is a story whose `code` is `NEW-1`, so `renumber` remaps it.

**4. Placeholder collisions with the backlog.** The risk is a backlog `Depends On` entry `NEW-5` meeting a different, newer proposed `NEW-5`, which `renumber` would silently bind. Decision 2's `nextPlaceholder` scans the backlog's `Depends On` entries, so a new proposal never takes a number the backlog still mentions. The portal therefore cannot create the collision, and `acceptProposed` adds no further guard. A collision can only come from a proposals file written by something else, so the follow-up writer script must use the same allocation rule; that is a contract the follow-up change has to carry.

**5. Proposed tab state is a separate hook, not a second `useBacklog`.** `useProposals(current)` mirrors `useReview`: it loads `proposals/<current>` (a missing file is an empty list; the first save creates it through the store's `create`), exposes `stories`, `selectedId`, the edit actions, and its own debounced save with retry. It reuses the existing `useAutosave` for write timing (parameterised with its store) rather than copying `useReview`'s hand-rolled timers. `useBacklog` is not generalised; only a new action `replaceStories` is added to it (used by accept) so the two hooks stay independent.

**6. Accept is orchestrated in `App.jsx` as two dispatches from one pure result.** `acceptProposed` is computed from the current state of both hooks; on success the backlog hook gets `replaceStories` (renumbered stories) and the proposals hook gets `replaceStories` (remaining, re-pointed stories). Each saves through its own autosave. Alternative considered: a single hook owning both files; rejected as a large refactor of `useBacklog`.

**7. Reuse of components.** `StoryList` and `StoryForm` are given the proposals' stories. For `Depends On` choices, `StoryForm` receives `stories` = backlog stories followed by proposed stories, with the open story being a proposed one; `dependencyChoices` already filters self and cycles. `onCommitEpic` for proposals only sets `codedEpic` (no renumber). Drag reordering in the list calls a proposals-only reorder (array move). The Proposed tab passes no review suggestions. If `StoryForm`/`StoryList` assume derived IDs in a way that fails for `NEW-<n>` (for example grouping by epic prefix), the task list covers adapting them.

**8. Unresolved dependency message.** `backlogProblems` returns "Depends On lists NEW-5, a story that is still proposed" for an entry matching `/^NEW-\d+$/` that is not a story in the list; other missing entries keep their message.

**9. Tab visibility and creation.** The tab is always shown, labelled `Proposed (n)` (0 without a file), so stories can be drafted by hand and the follow-up skills need no setup. Opening the tab never writes: the file is created by the first save after an edit or add, so no empty file appears for a backlog that is only looked at. Accepting the last story leaves an empty file (header only), which is harmless.

## Risks / Trade-offs

- [Two files are saved separately, so a crash between saves can leave a story in both files or in neither] -> accept dispatches the backlog change first, so the failure mode is a visible duplicate, not a lost story; each autosave retries on failure; duplicates are deleted from the Proposed tab.
- [`StoryList`/`StoryForm` make assumptions that break for placeholder IDs] -> a task reviews both before wiring and adds tests for the pure parts; UI behaviour is verified manually since the project has no DOM tests.
- [A user edits a placeholder `NEW-<n>` by hand in Excel] -> out of scope; `nextPlaceholder` still avoids numbers in use, and malformed IDs are treated as unknown entries.
- [`loadBacklog` option widens a core function] -> it only skips one call and defaults to current behaviour; existing tests keep passing and a new test pins the default.

## Open Questions

None.
