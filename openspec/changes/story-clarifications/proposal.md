## Why

Stories are parked (benched) or left half-agreed because the team lead has open questions about technical details and scope. Today those questions live in free-text Notes, so they cannot be seen at a glance, tracked until answered, or fed back into refining the story. The team lead wants a place on every story for questions and their answers, and a skill that helps define the questions worth asking.

## What Changes

- New `Clarifications` column on backlog and proposals CSVs: Q/A pairs (`Q<n>:` / `A<n>:`), editable in the portal on both the Editor and Proposed tabs. A question with an empty answer is open. A story with no questions counts as cleared.
- The story lists show an "N open" badge so follow-ups are visible at a glance.
- Open questions block nothing: not editing, not accepting. The Q&A travels unchanged from Proposed to the backlog on accept.
- **BREAKING**: **Benched** becomes a real gate. Accept is disabled for a benched story; the user unbenches it first. Today accepting works on a benched story and clears the flag.
- New skill `clarify-stories` for **proposed stories only** (benched or not). It is focused on getting the user's questions and blockers out of their head and into text: it records them, and answers the user states, in `Clarifications`, and may edit any other field of the story, like `propose-stories` patches, when an answer or insight changes it. It cannot create stories or set Priority. For stories **in the backlog** it can read and suggest but never edit: it writes suggestions (questions and ordinary field edits) to the review file, which you Apply or Dismiss in the Review tab like `review-backlog` suggestions. Writing is confirmed with an `AskUserQuestion` yes/no, not a typed "yes".
- Review suggestions gain a `Clarifications` field (action `append`) and a `Clarification` area; Apply in the portal adds an unanswered question.
- `review-backlog` now writes its open questions (for example a single-story Feature) as `Clarifications` suggestions instead of `Notes` appends. Notes stays for facts and decisions.
- Two new scripts used only by the clarify skill: `read-clarify-context.mjs` (backlog, benched and unbenched proposals, and the current review) and `write-clarifications.mjs` (patches existing proposed stories, benched included). For backlog stories the clarify skill uses the existing `write-review.mjs`, in its `--append` form only. No skill writes `user-stories/`. The existing readers and writers are not given new permissions.
- `explore-stories` and `propose-stories` keep ignoring benched stories. For unbenched stories their reader now prints `Clarifications`, so answered Q&A shapes the refinement. `propose-stories` patches still cannot write `Clarifications`, and still refuse benched stories.

## Capabilities

### New Capabilities
- `story-clarifications`: the `Clarifications` column, its Q/A format and open/cleared states, the portal section and badge, the benched gate on accept, the clarify skill, its separate reader and writer, and how explore/propose use the answers.

### Modified Capabilities
- `story-proposals`: Accept is refused for benched stories.
- `user-story-editor`: the CSV format gains the `Clarifications` column.
- `backlog-review-suggestions`: clarification suggestions (new field, action and area, and what Apply does), and open questions go to Clarifications instead of Notes.

## Impact

- `core/`: `model.js` (column, story field, serialize), `story-text.js` or a sibling (Q/A compose and parse, open count), `review.js` (new field, area, apply, stale check), `proposals.js` (accept guard, column carried to the backlog).
- `app/frontend/user-story-generator/`: `StoryForm.jsx`, `StoryList.jsx`, `ProposedTab.jsx`, `ReviewTab.jsx`, `Suggestions.jsx` (section, badge, disabled Accept, new suggestion kind).
- `.claude/skills/clarify-stories/` (new: `SKILL.md`, `locked-settings.json`, `guard-bash.mjs`, `read-clarify-context.mjs`, `write-clarifications.mjs`), `.claude/skills/review-backlog/SKILL.md` and `write-review.mjs`, `.claude/skills/explore-stories/read-story-context.mjs` (prints the column), `ai/launchers/clarify-stories.ps1` (new), `core/proposal-input.js` (shared validation, reused).
- `CLAUDE.md` (skills still never write the backlog), `README.md`, tests under `test/`.
- Existing backlog files without the column keep working; the column is added on save.
