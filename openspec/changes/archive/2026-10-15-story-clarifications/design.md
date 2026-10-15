## Context

See proposal.md for motivation. Current state that shapes the approach:

- `core/model.js` knows a fixed `COLUMNS` list plus the proposals-only `Benched`; unknown columns round-trip in `story.cells`. Acceptance criteria already have a parse/compose pair in `core/story-text.js` that keeps unparseable text raw.
- `core/proposals.js` clears `benched` on accept (line ~95) and accept already validates a set of stories all-or-nothing.
- `read-story-context.mjs` strips benched rows and the `Benched` column (`withoutBenched`). `write-proposal.mjs` never touches `user-stories/`.
- Each skill has its own `locked-settings.json` and a Bash guard (`explore-stories/guard-bash.mjs` with `--read-only` / `--read-write`). Backlog IDs are derived and move on reorder.

## Goals / Non-Goals

**Goals:**
- One `Clarifications` cell per story, same representation in backlog and proposals, so it travels untouched on accept and move-to-proposed.
- Explore and propose draw out unknowns and record them, with no new skill, reader, writer or guard.

**Non-Goals:**
- No summarising of Q&A into Notes, no auto-deleting answered pairs.
- No gating on open questions. The only accept gate is Benched.
- No skill writes `user-stories/`. No change to who may create stories or set Priority.

## Decisions

**Column name and format.** `Clarifications`, lines `Q<n>: ...` / `A<n>: ...`, parsed like the acceptance criteria (multi-line answers continue until the next `Q<n>:`; non-conforming cells are kept raw). Alternative: a JSON cell: rejected, it is unreadable in Excel and hostile to hand edits. A `Q;`/`A;` per-row layout: rejected, one cell keeps one story per row.

**Open/cleared is derived** from empty answers, never stored, so it cannot drift from the text. A story with no pairs is cleared.

**Core shape.** `parseClarifications` / `composeClarifications` / `openCount` live beside `story-text.js` and are pure, so they are covered by `node --test`. `story.clarifications` is a list of `{q, a}` plus `rawClarifications` for free text, mirroring `criteria` / `rawCriteria`. `Clarifications` is added to `COLUMNS` (not a proposals-only column), so backlog files get it on save.

**Benched gate.** Enforced in `core/proposals.js` where accept already validates all-or-nothing, and mirrored in the UI by disabling Accept with the reason. The accept path stops clearing `benched`, since a benched story can no longer be accepted. Backlog stories moved to Proposed keep their other flags as today.

**Writer: extend `write-proposal.mjs`.** A new story may carry `clarifications: [question...]`. A patch may carry `clarifications: { add: [question...], answer: [{n, text}] }`. Adds append with the next numbers; an answer is accepted only for an existing pair with an empty answer; a pair is never deleted or overwritten. Validation, all-or-nothing and the typed yes/no are the existing ones, and benched stories stay refused. Alternative: a separate clarify skill with its own reader, writer, guard and launcher: rejected, it duplicated explore's stance and propose's patch writer and added context for little. Cost accepted: a benched story must be unbenched in the portal before it can be discussed, and backlog stories cannot be given questions from chat (portal, `review-backlog`, or move to Proposed).

**Stance, written once.** `ai/guidelines/product-backlog.md` gets a short section: complete the story as far as the facts allow, turn each unknown the user cannot settle in chat into a question, never guess an answer, and record answers the user states. `explore-stories` asks for such unknowns while discussing; `propose-stories` writes them. Both cite the section and do not restate it.

**Backlog stories: suggestions through the review pipeline.** Unchanged: `core/review.js` has `Field` `Clarifications` (action `append` only), `Area` `Clarification`, an apply step that appends an empty-answer pair, and a stale check for a duplicate question. `review-backlog` writes its open questions as `Clarifications` suggestions instead of `Notes` appends; Notes stays for facts and decisions.

**Reader output for explore/propose.** `read-story-context.mjs` already prints unbenched columns, so `Clarifications` appears once it is in the file; the tests only need to assert it is not stripped and that benched rows still are. `write-proposal.mjs` gains the `clarifications` key (above); tests pin its add/answer rules.

## Risks / Trade-offs

- [A fresh `review-backlog` run without `--append` replaces the whole review, clarification suggestions included] → same as any other row today; the SKILL.md says so.
- [Concurrent portal autosave and a skill write overwrite each other] → same limitation as `write-proposal.mjs` today; the portal's save reloads on conflict as it does for proposals today. Verify during implementation whether the portal re-reads before saving; if not, tell the user in the skill's report to reload.
- [Accept no longer clears `benched`] → a benched story cannot reach the backlog, so no stale flag can; moving a backlog story to Proposed leaves it unbenched as today.
- [Behavior change for existing benched stories] → previously acceptable benched stories now need unbenching. Documented in the proposal as BREAKING.
