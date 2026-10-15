## Context

See proposal.md for motivation. Current state that shapes the approach:

- `core/model.js` knows a fixed `COLUMNS` list plus the proposals-only `Benched`; unknown columns round-trip in `story.cells`. Acceptance criteria already have a parse/compose pair in `core/story-text.js` that keeps unparseable text raw.
- `core/proposals.js` clears `benched` on accept (line ~95) and accept already validates a set of stories all-or-nothing.
- `read-story-context.mjs` strips benched rows and the `Benched` column (`withoutBenched`). `write-proposal.mjs` never touches `user-stories/`.
- Each skill has its own `locked-settings.json` and a Bash guard (`explore-stories/guard-bash.mjs` with `--read-only` / `--read-write`). Backlog IDs are derived and move on reorder.

## Goals / Non-Goals

**Goals:**
- One `Clarifications` cell per story, same representation in backlog and proposals, so it travels untouched on accept and move-to-proposed.
- A clarify skill for proposed stories whose reader and writer are separate files, with a separate guard, so explore/propose gain no capability. It is elicitation-first but may edit the whole ticket, like a propose patch.

**Non-Goals:**
- No summarising of Q&A into Notes, no auto-deleting answered pairs.
- No gating on open questions. The only accept gate is Benched.
- No skill writes `user-stories/`. The clarify skill cannot create stories or set Priority. It edits proposed stories and only suggests for backlog stories.

## Decisions

**Column name and format.** `Clarifications`, lines `Q<n>: ...` / `A<n>: ...`, parsed like the acceptance criteria (multi-line answers continue until the next `Q<n>:`; non-conforming cells are kept raw). Alternative: a JSON cell: rejected, it is unreadable in Excel and hostile to hand edits. A `Q;`/`A;` per-row layout: rejected, one cell keeps one story per row.

**Open/cleared is derived** from empty answers, never stored, so it cannot drift from the text. A story with no pairs is cleared.

**Core shape.** `parseClarifications` / `composeClarifications` / `openCount` live beside `story-text.js` and are pure, so they are covered by `node --test`. `story.clarifications` is a list of `{q, a}` plus `rawClarifications` for free text, mirroring `criteria` / `rawCriteria`. `Clarifications` is added to `COLUMNS` (not a proposals-only column), so backlog files get it on save.

**Benched gate.** Enforced in `core/proposals.js` where accept already validates all-or-nothing, and mirrored in the UI by disabling Accept with the reason. The accept path stops clearing `benched`, since a benched story can no longer be accepted. Backlog stories moved to Proposed keep their other flags as today.

**Separate reader and writer.** New `clarify-stories/read-clarify-context.mjs` prints the guidelines, the backlog (context) and the proposals including benched stories and the `Benched` column; it does not reuse `withoutBenched`. `write-clarifications.mjs` is a patch writer on `proposals/<name>` only. Alternative: a `--include-benched` flag on the existing reader, or reusing `write-proposal.mjs`: rejected, both would widen scripts explore/propose are already allowed to run, and `write-proposal.mjs` refuses benched stories on purpose. A new guard `clarify-stories/guard-bash.mjs` allows only the two new scripts, so the old guard stays unchanged.

**Writer operations.** Input items are patches: `{ id: "NEW-<n>", <patch fields>, clarifications: { add: [question...], answer: [{n, text}] } }`. Patch fields are those of a `write-proposal.mjs` patch (epic, feature, title, userStory, points, dependsOn, criteria, notes) and are validated as the merged story with the shared `core/proposal-input.js` rules. Differences from `write-proposal.mjs`: benched stories are allowed (this skill exists for them), the flag itself is never changed, and no new stories can be created. Adds append with the next numbers; an answer is accepted only for an existing pair with an empty answer; a pair is never deleted. Unknown IDs, `priority`, `code`, `benched`, duplicates and empty items are rejected, all-or-nothing, and a story whose stored User Story or Criteria is free text is refused unless the patch replaces it. The file is re-read right before writing and every other row is kept as the portal wrote it.

**Backlog stories: suggestions through the review pipeline.** The clarify skill runs the existing `write-review.mjs <backlog> --append`, and its guard allows only that form, so it can never replace a review. `core/review.js` gains `Field` `Clarifications` (action `append` only), `Area` `Clarification`, an apply step that appends an empty-answer pair, and a stale check for a duplicate question. `write-review.mjs` accepts those rows, so `review-backlog` also writes its open questions as `Clarifications` suggestions instead of `Notes` appends; Notes stays for facts and decisions. Alternatives: a third clarify-only writer: rejected, once the review skill writes these rows too it protected nothing and added a script; a new file format for suggestions: rejected, the Review tab, badges, stale and lock handling already exist.

**Confirmation.** `AskUserQuestion` ("Yes, write" / "No, change something"). The skill shows per story the new questions, recorded answers, and each changed field with old and new value, then runs the writer in the same turn only after the yes option, and asks again after any edit. `propose-stories` keeps its typed yes/no unless changed separately.

**Stance vs propose.** The skill's SKILL.md leads with drawing out unknowns (technical details, ownership, dependencies, edge cases) and prefers recording a question over guessing an answer. Field edits follow from answers the user gave. It does not size or restate the guidelines; it cites them.

**Reader output for explore/propose.** `read-story-context.mjs` already prints unbenched columns, so `Clarifications` appears once it is in the file; the tests only need to assert it is not stripped and that benched rows still are. `write-proposal.mjs` already rejects unknown keys, so `clarifications` is rejected; a test pins it.

## Risks / Trade-offs

- [A fresh `review-backlog` run without `--append` replaces the whole review, clarify suggestions included] → same as any other row today; both SKILL.md files say so.
- [Overlap with `propose-stories` patches] → both skills state their entry point (questions in mind vs a draft in mind); neither can create or write what the other owns.
- [Concurrent portal autosave and a skill write overwrite each other] → same limitation as `write-proposal.mjs`; the portal's save reloads on conflict as it does for proposals today. Verify during implementation whether the portal re-reads before saving; if not, tell the user in the skill's report to reload.
- [Accept no longer clears `benched`] → a benched story cannot reach the backlog, so no stale flag can; moving a backlog story to Proposed leaves it unbenched as today.
- [Behavior change for existing benched stories] → previously acceptable benched stories now need unbenching. Documented in the proposal as BREAKING.
