## Why

Stories are parked (benched) or left half-agreed because the team lead has open questions about technical details and scope. Today those questions live in free-text Notes, so they cannot be seen at a glance, tracked until answered, or fed back into refining the story. The team lead wants a place on every story for questions and their answers, and the existing explore/propose flow to recognise them: make the story as complete as the facts allow, and draw the unknowns out during the discussion.

## What Changes

- New `Clarifications` column on backlog and proposals CSVs: Q/A pairs (`Q<n>:` / `A<n>:`), editable in the portal on both the Editor and Proposed tabs. A question with an empty answer is open. A story with no questions counts as cleared.
- The story lists show an "N open" badge so follow-ups are visible at a glance.
- Open questions block nothing: not editing, not accepting. The Q&A travels unchanged from Proposed to the backlog on accept.
- **BREAKING**: **Benched** becomes a real gate. Accept is disabled for a benched story; the user unbenches it first. Today accepting works on a benched story and clears the flag.
- Review suggestions gain a `Clarifications` field (action `append`) and a `Clarification` area; Apply in the portal adds an unanswered question.
- `review-backlog` now writes its open questions (for example a single-story Feature) as `Clarifications` suggestions instead of `Notes` appends. Notes stays for facts and decisions.
- No new skill. `explore-stories` and `propose-stories` treat `Clarifications` as part of a story: they make a best-effort complete story, turn each unknown the user cannot settle in chat into a question instead of a guess, ask for such unknowns while discussing, and record answers the user gives. The rule is written once in `ai/guidelines/product-backlog.md`; both skills cite it.
- `write-proposal.mjs` accepts a `clarifications` key: a new story may carry questions; a patch may add questions and record an answer on a pair whose answer is empty. A pair is never deleted or overwritten. Benched stories are still refused, so resuming a parked story means unbenching it in the portal first.
- `read-story-context.mjs` prints `Clarifications` for unbenched stories, so open and answered questions shape the refinement.
- Stories already in the backlog get questions from the portal's Editor tab or from `review-backlog` suggestions. To discuss one in chat, move it to Proposed. No skill writes `user-stories/`.

## Capabilities

### New Capabilities
- `story-clarifications`: the `Clarifications` column, its Q/A format and open/cleared states, the portal section and badge, the benched gate on accept, and how explore/propose draw out, record and use questions and answers.

### Modified Capabilities
- `story-proposals`: Accept is refused for benched stories; the proposal writer accepts `clarifications`.
- `user-story-editor`: the CSV format gains the `Clarifications` column.
- `backlog-review-suggestions`: clarification suggestions (new field, action and area, and what Apply does), and open questions go to Clarifications instead of Notes.

## Impact

- `core/`: `model.js` (column, story field, serialize), `story-text.js` or a sibling (Q/A compose and parse, open count), `review.js` (new field, area, apply, stale check), `proposals.js` (accept guard, column carried to the backlog).
- `app/frontend/user-story-generator/`: `StoryForm.jsx`, `StoryList.jsx`, `ProposedTab.jsx`, `ReviewTab.jsx`, `Suggestions.jsx` (section, badge, disabled Accept, new suggestion kind).
- `.claude/skills/propose-stories/write-proposal.mjs` and `core/proposal-input.js` (the `clarifications` key), `.claude/skills/explore-stories/read-story-context.mjs` (prints the column), `SKILL.md` of `explore-stories`, `propose-stories` and `review-backlog`, `ai/guidelines/product-backlog.md` (the best-effort-plus-questions rule).
- `CLAUDE.md`, `README.md`, tests under `test/`.
- Existing backlog files without the column keep working; the column is added on save.
