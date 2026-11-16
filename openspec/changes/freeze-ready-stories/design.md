## Context

Plan writes a slice, verifies it and then runs `write-freeze.mjs` on every story the slice covers. The writer refuses a story with no ID or with the wrong ID prefix, and nothing else. Verify reports an open clarification as a warning, so plan never stops on one. A frozen story is read-only in the portal and for the story skills, which is why an open question on it can never be cleared. See the proposal for the motivation.

The viewer's shared code already counts open questions: `parseClarifications` and `openCount` in `viewer/shared/backlog/story-text.ts`. `sync-skill-logic.ts` copies shared code into each skill's `lib/` as plain `.mjs`, so the freeze writer can use the same counting the portal uses.

## Goals / Non-Goals

**Goals:**
- A frozen story always has every question answered and is built in full by its slice.
- The rule holds in the writer, not only in the skill text.

**Non-Goals:**
- No per-criterion build tracking and no slice that covers part of a story.
- No new stage between propose and plan.
- No change to verify, archive or the portal, and no way to unfreeze.

## Decisions

### Readiness is "no open clarification", checked in two places

Plan checks it early, from the clarifications it already reads for every story in scope, so the user hears about it before answering the design questions. The writer checks it again at the freeze, so a skipped or misread step cannot freeze an unready story. Plan's early check is the user-facing one; the writer is the guard. A `TBC` design decision does not make a story unready, because it belongs to the slice, not the story.

The alternative of making verify's check critical was rejected: verify runs after the slice is written and read back, so the user would have answered the design questions for a story that then cannot be frozen.

### Unready stories are left out, not blocking

Plan drops an unready story from the slice and the freeze and carries on with the rest. Blocking the whole plan would punish the ready stories. A slice then covers fewer stories than the user named, so plan says so before the yes/no, in the sentence it already uses to list what will be frozen.

### Partial scope is a split before the freeze, not a partial slice

The slice document and `tasks.md` are built around one row and one task per acceptance criterion, and archive, validate and the staleness hash all assume a story is built in full. Letting a slice cover part of a story would touch all of them. A split uses the machinery that exists: `jois-story-propose` already drafts a change to a backlog story as a review suggestion and a new story as a proposal. Because the story is not yet frozen, the suggestion can edit it.

### Plan does not run the split itself

Story skills write only proposals, review rows and lexicon files, and plan writes only the slice, the context map and the `Frozen` flag. Plan therefore names the split, offers `jois-story-propose` in the same session as it does for other story changes, and the user accepts in the portal and runs plan again. This keeps the single-writer rule of `plan-stories-skill` ("Never writes outside diagrams").

## Risks / Trade-offs

- **An extra round trip for a stub.** The user splits, accepts and re-runs plan. This is intended: the cost lands before the freeze, when it is cheap.
- **A story found too big after the freeze.** The split cannot happen then, so a superseding story is the only route, as today. The scope question at the checkpoint is the main defense, so it lists the criteria.
- **A saved sample stage with an open question on a frozen story** would fail the new writer rule if it were run again; recording a stage costs model tokens, so ask the user before doing it.

## Open Questions

None that change what gets built. One assumption is recorded: the split is offered, not run, by plan (see above). Revisit it if the round trip proves too slow in practice.
