## Context

A story's lock is the `Locked` column. `lockStories` and `unlockStories` in `core/ids.js` already skip stories without an ID, and `useBacklog` has a `lock` reducer action taking a set of ids (used by the form toggle and Lock selected). `StoryList` renders `epic-head` and `feature-head` rows from `groupByEpic`, and each group already carries its `stories`. Both heads are clickable (fold) and draggable (move group). The component is also used by the Proposed tab, which has no locks. See proposal.md for the chosen model: a bulk action, not stored state.

## Goals / Non-Goals

**Goals:**
- Reuse the existing story lock end to end; the group lock only chooses which ids to lock.
- Show the group's state on the header without storing it.

**Non-Goals:**
- A stored group lock, or refusing stories that enter a locked group.
- Changing what a locked story allows.
- Locking from the Graph tab or from group rows in the Stories tab.

## Decisions

- **Reuse the `lock` action.** `actions.lockGroup(stories, on)` dispatches the same `lock` action with the ids of the group's stories and returns `{ skipped }` like `lockChecked`. Alternative: a dedicated reducer case; rejected, it would duplicate the skip rule.
- **State is a pure function in `core/ids.js`.** `groupLockState(stories)` returns `'all'`, `'some'` or `'none'`, counting every story passed in. A group holding a story without an ID can therefore never read `'all'`, so its button keeps offering Lock and reports the skip. This keeps the direction of the toggle ("lock if any is unlocked") one rule, and it is testable without the DOM.
- **Opt-in prop.** `StoryList` takes `onLockGroup`; without it no button renders, so the Proposed tab is unchanged (the same pattern as `collapse` and `onMoveGroup`).
- **Button inside the head.** A `<button>` in the header row that calls `stopPropagation` on click and key events and is not draggable, so it neither folds the group nor starts a group drag. Its label is the state (lock mark, partial mark, or an open-lock mark for none), and its `title` and `aria-label` say what a click does ("Lock 3 stories in Sign in").
- **Message.** The skipped count goes through the note line the Editor already uses for Delete and Lock selected feedback.

## Risks / Trade-offs

- [A locked group can still gain unlocked stories] → The partial mark on the header shows it and one click locks the rest. Stored group locks are a non-goal.
- [A small button inside a draggable row may start a drag by mistake] → Not draggable and `stopPropagation`; check by hand in the browser, as the repo has no DOM tests.
