# Design

## Context

See proposal.md for why. The Graph tab (`viewer/frontend/src/tools/backlog/features/graph/`) lays out whatever list of items it is given. `layoutGraph` in `graph.ts` reads only `id`, `code` and `dependsOn`, resolves each `Depends On` entry against the codes in that list, and reports the rest as unresolved. `groupStories` turns stories into feature or epic items of the same shape. Today `GraphTab` passes it the open backlog's stories only.

`useOtherBacklogs` already reads every other backlog of the data folder after each open, relink job and migration. It keeps the parsed stories internally, exposes only a lookup index and a set of codes, and quietly drops a backlog it cannot read.

A migration (`useMigrateFlow.ts`) writes the target backlog first, then hands the source's save a list of "forwards" (each migrated story's old code, mapped to its new code in the target). The autosave adds them to the save's ID changes, so the server's `POST /api/relink` rewrites the old codes in every other backlog's stories, proposals and open review rows, the target included. The moved stories keep their links on the old IDs on purpose, so that this one relink shifts them exactly once. The source review is open in memory: `useReview` saves it on its own and today the flow marks the migrated stories' rows dismissed.

## Goals / Non-Goals

**Goals:**

- Show the open backlog's links to other backlogs without changing how `layoutGraph` places nodes, clusters or cycles.
- Move review rows through the same single relink that already moves story links, so there is one mechanism for "an old ID now means a new one".
- Cover the migration edge cases with tests over the shared pure functions the flow calls, since the project has no DOM tests.

**Non-Goals:**

- Following a chain of links through stories of other backlogs at the Stories level. Only the open backlog's direct links are drawn.
- A server endpoint for the Backlogs level. The portal already holds every backlog it can read.
- Changing the Editor's dependency checks when a backlog cannot be read.

## Decisions

### 1. Dashed nodes are extra items in the same layout

A new pure function `withOtherStories(stories, others)` in `graph.ts` returns the open stories plus one item per story of another backlog that is linked with the open backlog. Each extra item gets a negative `id` (story ids are positive, so they never collide) and carries `backlog` and `title` for drawing.

- An item the open backlog depends on gets an empty `dependsOn`, so it has no arrow of its own. The open story's entry resolves to it, so the arrow comes for free.
- An item that depends on the open backlog keeps only the entries that name open stories. This leaves out the other backlog's internal links, as the spec asks.
- A story that is both a dependency and a dependent is one item, so a cycle through another backlog is a cycle in the layout. `layoutGraph` then reports it with no new code.

An extra item resolves, so it is no longer unresolved, and a code with another backlog's initials that no story has still is. This is why the false "which no story has" notes go away with no special case.

The alternative was a second layout pass that pins the other backlogs' nodes in their own column. It would have needed its own edge routing and cycle detection, and it would have split a cluster that crosses backlogs into two.

### 2. Features and Epics: one dashed group per backlog

`groupStories` already keys each story by its epic, or by its epic plus its feature. The extra items get the key `\u0002<backlog>` (a character no epic name holds), so each other backlog becomes one group with its name and its count of linked stories. Arrow weights and the "story links behind the arrow" list come out of the existing `pairs`. `GraphDetail` shows an extra item by ID, Title and backlog name rather than as a button.

### 3. Backlogs level groups every backlog's stories

A new pure function `groupBacklogs(backlogs)` in `graph.ts` takes `{ name, initials, stories }` for every backlog. It resolves each `Depends On` entry against the codes of all of them, and returns items, groups, `pairs` and `mutual` in the same shape as `groupStories`, so the canvas, detail list, mutual-dependency notes and "No dependencies" list work unchanged. The open backlog's entry uses its in-memory stories, so an edit shows before it is saved. The node for the open backlog carries a flag that the canvas draws as a marked node.

### 4. `useOtherBacklogs` returns the lists and the unreadable names

The hook already reads `{ name, stories }` for each other backlog. It will also return:

- `lists`: each backlog's name, initials and stories;
- `unreadable`: the name of each backlog whose read failed.

`BacklogTool.tsx` passes these, with the open backlog's initials, to `GraphTab`.

The initials of an unreadable backlog are unknown, so the graph cannot tell which unresolved codes belong to it. While any backlog is unreadable, the unresolved note therefore leaves out codes that do not start with the open backlog's initials, and the note naming the unreadable backlog explains why. A missing story of the open backlog itself is still listed.

### 5. Read-only is decided by the sign of the id

In `GraphTab` a negative id means a story of another backlog:

- `clickNode` selects it, and the hint names its backlog.
- Open in Editor and Link stay disabled for it, and the canvas draws no link handle on it.
- `link` refuses it as either end, with a note that says such a link is added in the Editor.
- `removeEdge` and Delete act only on an arrow whose `from` is positive, because only the open backlog stores that link.

The canvas draws the node with a dashed border and the backlog name in place of the epic stripe, and the legend gains its entry only when a dashed node is shown.

### 6. Review rows move unchanged and the relink renames their IDs

A new pure function `moveReviewRows(source, target, codes)` in `viewer/shared/review/review.ts` takes the source's open units whose story code is in `codes` (the migrated stories' old codes, with each split kept whole). It returns:

- the source rows without them;
- the target rows with the moved rows appended;
- how many rows moved.

A moved Group name that the target already uses becomes `<name>-2`, `-3` and so on, the first one free.

The rows keep their old source IDs in `Story ID` and `Depends On`. The source save's relink already maps every migrated old code to its new code, and every other renumbered source code to its new one, in each other backlog's open review rows, the target's included. The rows therefore land on the new IDs in the same single step that moves the story links, which is the order #143 relies on.

Mapping the IDs in the flow instead would have rewritten them twice: once in the flow and again by the relink, for any `Depends On` value that names another source story. Rows on old IDs exist in the target's file only between the target review write and the end of the source save. The flow waits for that save before it reports success, as it already does for links.

### 7. Write order of a migration

The flow reads the target's review file next to the target backlog. A missing file reads as empty, because the server's read of a non-backlog kind returns empty text. After the confirmation, the order is:

1. Write the target backlog. On failure, stop with nothing changed, as today.
2. Write the target's review file, if any row moves. On failure, stop before the open backlog changes, and say the stories are now in both backlogs. This matches the existing rule that a later failure leaves the stories in both backlogs rather than neither.
3. Relink the target's own renumber, as today.
4. Register the forwards, replace the source stories, and remove the moved rows from the source review through a new `useReview.remove(indexes)`. It saves like `decide` does.
5. Wait for the source save and its relink, then show the note.

The confirmation counts the moved rows instead of the dismissed ones.

### 8. Edge cases are tested over the shared functions

The project tests only pure modules. A test helper in `viewer/test/shared/` chains the steps a migration makes:

- `loadBacklog`;
- `migrateStories`;
- `idChanges` with the forwards added;
- `relinkStories` for the source's in-memory proposals;
- the `relink*Text` functions for the other backlogs' files.

Each edge-case scenario of "Links follow migrated stories" is one test on that chain. A migration out and back is two runs of it. The third-backlog case also gets a server test in `viewer/test/backend/server-relink.test.ts` that writes temp copies of the sample data.

## Risks / Trade-offs

- **[Risk] A migration fails between the target review write and the source save, which leaves review rows on old source IDs in the target.** → The source save retries until it succeeds, as for links, and the rows land on their IDs then. Until it does, the target shows them as no longer matching a story, which is visible rather than silent.
- **[Risk] A large data folder makes the Backlogs level slow, because every backlog's stories are grouped on each render.** → The grouping is memoised on the lists and the open stories. It is linear in the number of links, and backlogs here hold hundreds of stories, not more.
- **[Trade-off] A cycle that runs through two or more stories of another backlog is not shown.** → The Stories level draws only direct links. The Backlogs level still shows the two backlogs depending on each other.
- **[Trade-off] While a backlog is unreadable, a truly missing code with another backlog's initials is not listed under the graph.** → The Editor still flags it, and the unreadable note says links may be missing.
