## Why

While a story is being shaped, the user often states the answer to one of its open questions. Today the skills can record that answer on the pair (proposals only) but can never remove the pair, and a backlog story's questions can only be added to. The settled decision stays as a `Q`/`A` pair, or as a duplicate in Notes, and the question keeps showing in the "N open" badge although nothing is unknown any more. Notes written by a skill into the proposals also cannot span more than one line, which makes a decision hard to record readably.

## What Changes

- A new **resolve** operation moves a question into Notes and removes its pair in one step. The skill composes the note as a decision ("Approvals are owned by Finance"); the question text may be left out when the answer carries it.
- **Proposals:** `write_proposals` patches accept `clarifications.resolve: [{ n, note }]`. The writer appends `note` to Notes on a new line and removes pair `n`, all-or-nothing with the rest of the call.
- **Backlog stories:** `write_review` accepts a `Clarifications` row with action `resolve`. The row carries the note and finds its pair by the question text (the `Q<n>` label is only a hint). Apply adds the note to Notes on a new line and removes the pair in one edit.
- A pair may be resolved whether its stored answer is filled or empty: "answered" means the user stated the answer in the session. A `note` is always required, so a bare delete stays impossible for the skills.
- **Proposed Notes may span several lines** in `write_proposals` (new stories and patches). The one-line rule for Notes is removed; Epic, Feature, Title, User Story, questions and answers stay one line.
- `propose-stories` and `/story:propose` use `resolve` when the user answers a question during shaping; `product-backlog.md` section 6 gets one rule for it.
- Existing keys (`add`, `answer`) and the `append` row on `Clarifications` are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-clarifications`: the proposal writer's `clarifications` key gains `resolve`; new requirement for resolving an answered question into Notes, with the guideline rule.
- `story-proposal-writer`: Notes may span several lines; patches can resolve clarifications.
- `backlog-review-suggestions`: the `resolve` action on `Clarifications` rows, its validation, staleness and Apply.

## Impact

- Code: `core/proposal-input.js`, `core/review.js` (validation, staleness, apply, and the Accept-all path that mirrors apply), `ai/mcp/story-tools.mjs` (tool descriptions built from `core/review.js` exports).
- Skills and guidelines: `.claude/skills/propose-stories/SKILL.md`, `ai/guidelines/product-backlog.md` section 6, `CLAUDE.md`.
- Tests: `test/write-proposal.test.mjs`, `test/review.test.mjs`, `test/write-review.test.mjs`, `test/story-tools-mcp.test.mjs`.
- No change to the CSV format, the portal UI (a `resolve` row is shown and applied through the existing suggestion UI), or the rule that no skill writes `user-stories/`.
