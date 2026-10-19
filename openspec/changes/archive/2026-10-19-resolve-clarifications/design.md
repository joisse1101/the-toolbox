## Context

See `proposal.md` for the motivation. Observed state:

- `core/proposal-input.js` validates `write_proposals` items. A patch's `clarifications` is `{ add, answer }`; pairs are addressed by position (`numbered(stored)`), and `applyPatch` builds the merged story that is then validated like a new story. `notes` is rejected when it contains a line break.
- `core/review.js` owns the review rows. `Clarifications` allows only `append`. Criteria show the pattern for position-shifting targets: the finding names `AC<n>`, `fillCurrent` records the criterion's text in `Current`, and `locateCriterion` later finds it by that text (the number is a hint). A row's effect is implemented twice: `editExisting` (one Apply in the portal) and `applySuggestions` (the batch used by Accept all and by the reducer); `suggestionState` decides stale or open.
- The portal's story form already treats Notes as a multi-line textarea and Clarifications as add/delete pairs. The portal can delete any pair; only the skills' writers were restricted.

## Goals / Non-Goals

**Goals:**
- One atomic way for a skill to move an answered question into Notes, for proposed and backlog stories.
- Multi-line Notes through `write_proposals`.

**Non-Goals:**
- Deleting a question without a note, or changing existing answers, through a skill.
- Any portal UI change beyond what existing suggestion rendering gives a new action.
- Making any other proposal field multi-line.

## Decisions

**1. `resolve` is one operation carrying the note, not a Notes row plus a removal row.** Two rows could be applied or dismissed separately, leaving a duplicate or losing the answer. The proposal writer's patch already makes both halves atomic; the review row makes them one Apply.

**2. Proposals: `clarifications.resolve: [{ n, note }]`, applied inside `applyPatch`.** `n` refers to the pairs as stored before the patch. Order within the merged story: resolve first (remove pairs, append notes in the order given), then `add`. Validation (in `checkClarifications`): `n` an integer naming an existing pair, no duplicate `n`, no overlap with `answer`, `note` non-empty text, "changes nothing" now counts `resolve`. Free-text Clarifications cells keep being refused. A patch's own `notes` is applied first and the resolve notes append to it. A pair is resolvable whether its answer is empty or not, because "answered" means stated in the session.

**3. Notes joining rule: append on a new line (the whole Notes when empty), the same as the review `append`.** Trailing blank space of the existing Notes is dropped before joining, matching `editExisting`.

**4. Multi-line Notes: only the `LINE_BREAK` check on `notes` is removed.** Line endings are normalised to `\n` and the value trimmed, so the stored CSV cell is the same as one typed in the portal. A note inside `resolve` is multi-line for the same reason. All other fields keep the check. CSV quoting already handles newlines (criteria cells are multi-line).

**5. Backlog: a `Clarifications` row with action `resolve`, the pair named in a new finding key `pair`.** This copies the criterion pattern: the writer validates `pair` against the story, `fillCurrent` stores the question text in `Current`, and a new `locatePair(story, row)` finds the pair by that text when the row is checked or applied, so other rows can be applied in any order even though removals renumber pairs. Alternatives considered: putting `Q<n>: question` in `Suggested` (collides with the note, which is the actual suggested value shown to the user) and a second column (changes the CSV format for one action). If two pairs have identical question text, the row is stale ("matches 2 questions"), as `locateCriterion` does.

**6. One implementation of the effect, used by both apply paths.** A helper in `core/review.js` (`resolvePair(story, row)`) returns the story with the note appended and the pair removed; `editExisting` and `applySuggestions` both call it, so Accept all cannot diverge from a single Apply. `suggestionState` returns stale when no pair matches, when the cell is free text, or when Notes already contain the note (`norm` compare, as for a Notes append).

**7. `review-backlog` stays append-only for Clarifications.** `validateFindings` takes the action set per source. Today the action table is per field (`Clarifications: ['append']`), shared by both skills; `resolve` is added there, and `review-backlog`'s SKILL.md simply never lists it. The `story-tools` `write_review` description lists it with its rules, built from the exports of `core/review.js` like the other rules (`test/story-tools-mcp.test.mjs` checks them).

**8. Skill behaviour.** `propose-stories` composes the note as a decision (the question's wording is dropped when the answer carries it), shows it with the question being removed in the one complete draft before the yes/no, and uses `resolve` for a proposed story or a `resolve` review row for a backlog story. The rule lives once in `product-backlog.md` section 6; the skill cites it. Per the existing "read back after every writer call" rule, the read-back of a proposal patch checks Notes and the missing pair; of a review row, the open row.

## Risks / Trade-offs

- [Pair numbers shift after a resolve, so a later patch in the same call or session could address the wrong pair] → `resolve` and `answer` refer to the stored numbering before the patch, and the skill re-reads the story after every write (already required). Two patches to one story in one call stay refused (existing rule).
- [A model could resolve a question the user did not actually answer] → the note is shown in the draft with the removed question and needs the yes/no; the guideline says to resolve only an answer the user stated. A bare delete stays impossible.
- [Accept all applies a resolve row in a batch with other rows on the same story] → the shared helper and text-based lookup make order irrelevant; covered by a reducer test.
- [Longer Notes in `read_context` output] → unchanged size class; proposals are already printed in full.
- [Multi-line Notes in a proposals CSV read by a hand-edited tool] → CSV quoting is standard and already used for criteria.
