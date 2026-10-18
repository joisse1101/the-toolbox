## Context

`layoutGraph(stories)` in `graph.js` is generic: it needs items with `id`, `code` and `dependsOn` (codes), and returns layered nodes, edges, clusters, unlinked items and a cycle flag. `GraphTab.jsx` renders that result and owns zoom/pan/selection and the link-editing gestures. Epic and Feature are plain trimmed strings on each story; `core/ids.js` groups features inside their epic, so a feature is identified by epic plus feature. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Reuse `layoutGraph`, its edge routing and `GraphTab`'s view maths for the coarse levels, so the new code is a grouping step plus rendering.
- Keep the grouping pure and testable in `graph.js`, with no DOM.

**Non-Goals:**
- Editing dependencies between groups.
- Expanding or collapsing single groups inside one graph, or switching level automatically by zoom amount.
- Any change to `core/`, the backend, CSV columns or the Stories level behaviour.

## Decisions

**Group, then lay out.** New `groupStories(stories, level)` returns pseudo-stories `{ id, code, dependsOn }` for `layoutGraph`, one per group, with a small numeric `id` and a `code` equal to the group key (the epic, or epic and feature joined by a control character). A group's `dependsOn` is the set of other groups' keys its stories depend on. Alternative: write a second layout for groups. Rejected: it duplicates the routing and cluster code.

**Aggregated data returned alongside.** `groupStories` also returns, per group: name, epic, story count and internal link count, and per group-to-group edge the list of underlying story pairs, so the weight is the pair count and the detail list needs no recomputation. `GraphTab` looks edges up by `from>to`, as it does today.

**Mutual dependency is not a cycle.** `layoutGraph` handles a cycle by marking the closing edge `back` and setting `cyclic`. For groups that is a legitimate shape, so the tab ignores `cyclic` at coarse levels and reads mutual pairs from the grouping (A->B and B->A both present) for the note. Both arrows are still drawn, the back one with the existing back-edge routing. Longer group cycles (A->B->C->A) get the same `back` marking and a note worded as information, not an error.

**Level is tab state, not stored.** A `level` state in `GraphTab` (`stories|features|epics`) resets to `stories` when `current` changes, next to the existing reset and fit logic. Changing level re-fits the view and clears the selection, since ids differ per level; "Show stories" is the exception, setting the Stories level plus a highlight set of story ids. The highlight reuses the existing dimming (`lit`) by accepting an explicit set instead of `relatedIds`.

**Read-only coarse levels.** Drag handles are not rendered and Link and Remove dependency are disabled when the level is not Stories. A selected node or arrow shows a list panel under the hint line (where the notes are), each row a button calling `onOpen`.

**Unlinked groups.** Groups that `layoutGraph` leaves unlinked are listed under "No dependencies" with name and story count, reusing that list's markup. Stories without ID, Epic or (at Features level) Feature are excluded from grouping and, as today, not drawn.

**Selection highlight on groups.** Selecting a group uses `relatedIds` on the group edges, so the existing transitive highlight applies unchanged.

## Risks / Trade-offs

- [`GraphTab.jsx` is already about 400 lines and grows] -> keep grouping in `graph.js`, and put the group node and detail list in small components in the same folder rather than adding branches through the existing node code.
- [Group key collision if a name contains the separator] -> use a control character as separator and trim names as `ids.js` does.
- [Edge labels crowd arrows in dense graphs] -> draw the weight at the arrow's midpoint and hide it below a minimum zoom.
- [Handlers expect numeric ids in `data-node`] -> group ids are small integers assigned per call, so the Stories level handlers stay unchanged.
