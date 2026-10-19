## Why

The `review-backlog` skill checks each story on its own (hierarchy, INVEST, acceptance criteria) and reads only the backlog CSV and the guidelines. Since it was written the project gained a lexicon, proposals, clarifications with a `resolve` action and a sprint-points guideline, and none of them reach the review. Nothing compares stories with each other, so duplicates, contradictions, role-name drift, avoided words and overlaps with proposed stories go unseen. "Missing cases" is a one-line nudge, so edge-case coverage varies from run to run, and the single dump of the whole CSV can truncate on a large backlog.

## What Changes

- Add a pure module in `core/` that finds the **mechanical** inconsistencies across the backlog, the lexicon and the proposals, reusing `backlogProblems`, `storyIssues` and `lexiconProblems`. It adds: duplicate Epic > Feature > Title, off-scale points, a backlog story that duplicates a proposed one (same Epic, Feature, Title), a `Depends On` link to a story that is now only proposed, an avoided word used in a story, a lexicon term used under a different name, and a Clarifications pair that has an answer but was never resolved into Notes.
- `read-backlog.mjs` gains **sectioned reads** (`guidelines`, `sizing`, `lexicon`, `proposals`, `checks`, and the backlog by Epic) so a large backlog is read in pieces and never truncated. With no section it prints a menu with sizes. The scope line and the locked-story rules stay.
- `SKILL.md` becomes a whole-backlog consistency review in three passes: the mechanical report is turned into rows; a cross-story pass (overlaps, contradictions, role-name drift, lexicon use, proposal overlap, whether a Feature or Epic delivers what its name promises) is done per Epic; an edge-case pass cites a new guidelines section.
- `ai/guidelines/product-backlog.md` gets a new **edge-case checklist** section. A case the story already implies becomes an `add` acceptance-criterion row; a case that needs a decision becomes a Clarifications `append` row, so the "must not grow the story" rule holds.
- The skill proposes the existing `resolve` action for an answered pair (from the checks) and for an open question the story's Notes already answer (its own judgement), and lists `resolve` in its action table (it is missing there today).
- The skill stays read-only: it writes only `reviews/<backlog>` through `write-review.mjs`, and reaches the lexicon, proposals and sizing guideline only through `read-backlog.mjs`.

`Consistency` becomes a fifth review Area (rows from the cross-story, lexicon and proposal checks); the Review tab picks it up from the shared Area list. No change to the CSV columns or the Field/Action rules.

## Capabilities

### New Capabilities
- `backlog-consistency-checks`: the deterministic cross-file checks (backlog, lexicon, proposals), their output, and how `read-backlog.mjs` serves them in sections.

### Modified Capabilities
- `backlog-review-skill`: the skill reviews consistency across stories, the lexicon and proposals, reads in sections, covers edge cases through a cited checklist, and may propose `resolve`.
- `backlog-review-suggestions`: new `Consistency` Area; `review-backlog` may also write Clarifications `resolve` rows (today only `propose-stories` does).
- `backlog-guidelines`: the guidelines hold the edge-case checklist and how a finding from it is classified.

## Impact

- Code: new `core/backlog-checks.js` (pure) with `test/backlog-checks.test.mjs`; `core/review.js` (`AREAS`) with `test/review.test.mjs` and `test/story-tools-mcp.test.mjs`; `.claude/skills/review-backlog/read-backlog.mjs` and `test/read-backlog.test.mjs`; the skill's `guard-bash.mjs` allow-list for the new read forms (and `test/guard-bash.test.mjs`).
- Docs: `.claude/skills/review-backlog/SKILL.md`, `ai/guidelines/product-backlog.md`, `CLAUDE.md` (review-backlog paragraph).
- Specs: one new capability and three modified (above).
- No new dependencies. No data format or store changes.
