## Why

A `propose-stories` run in the data-portal session hit two failures. The validator rejected "As an approver, …" because the parser only knows "As a" (`\bas a\b`), and the skill had no warning. Later, `proposals/data-portal.csv` held only its header although `write_proposals` had reported "4 in the file now"; the skill had also reported the write as done without reading it back. The cause of the vanished file is not known, so this change adds detection, safe retry and a way to find the cause, not a guessed fix.

## What Changes

- **Accept "As an …"**: the role is everything between `As` and `I want`, article included ("a team lead", "an approver"), so the parser needs no special case and a portal save writes back exactly what was typed. The story form shows one "As" field.
- **Check before asking**: a new read-only tool `check_drafts` validates the same input as `write_proposals` (and the lexicon terms) and writes nothing. It is pre-approved like `read_context`. The skills call it before the yes/no, so a rejection costs no confirmation.
- **Safe retry**: a new story whose Epic, Feature and Title match a story already in the proposals file is not added again; the writer reports it as already present with its ID. A `dependsOn` entry `NEW-<k>` that points at such a story resolves to the existing ID.
- **Read-back in the writers**: after the atomic write, `write_proposals` re-reads the file and reports the IDs and row count found on disk; it fails if the written stories are not there.
- **Complete reads**: `read_context` says how many benched proposals it leaves out, and gains the sections `reviews` (open rows, or the rows of one story) and `lexicon-suggestions` (open rows), so every writer's result can be verified.
- **Write log**: the file API's `PUT` and the writers log each write as one structured line (store, file, row count, time, writer) so the next overwrite can be traced. No behavior change in the file API.
- **Skills**: `propose-stories` and `/story:propose` read back every file after each write in the same turn, claim "written" only when it matches, and on a mismatch say so and rewrite only the missing part. "Run each call once" is replaced by that rule. They also tell the writer's role rule up front ("As a" or "As an").

Not in this change: a conditional `PUT` (base version, 409 on mismatch) and any fix to the portal's `edits > 0` save trigger. The write log is meant to show whether the portal is involved first.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: the role field holds the article, so "As an …" is read and saved as typed.
- `story-proposal-writer`: "As an" is valid; a repeated new story is skipped, not added twice; the result reports what is on disk; a `check` mode validates without writing.
- `story-tools-mcp`: the `check_drafts` tool (read-only, pre-approved); `read_context` sections `reviews` and `lexicon-suggestions` and the benched count; tool descriptions state the retry rule.
- `story-writing-skills`: the Propose skill checks drafts before asking, reads back after every write, and recovers from a mismatch.
- `csv-file-store`: each write through the file API is logged.

## Impact

- Code: `core/story-text.js`, `core/model.js`, `core/review.js`, `core/proposal-input.js`, `.claude/skills/propose-stories/write-proposal.mjs`, `.claude/skills/explore-stories/read-story-context.mjs`, `ai/mcp/story-tools.mjs`, `ai/launchers/story-tools-config.ps1` and the launchers' `--allowedTools`, `app/backend/server.cjs`, `StoryForm.jsx`.
- Skills: `.claude/skills/propose-stories/SKILL.md`, the `story:propose` command, and the skills' `allowed-tools`.
- Tests: `story-text`, `model`, `proposal-input`, `write-proposal`, `read-story-context`, `story-tools-mcp`, `propose-skill`.
- Data: no change to any CSV format that existing files could not already hold; the stored sentence is unchanged, so every existing file round-trips byte for byte (only the in-memory role now reads "a team lead", not "team lead").
