## Why

The Proposed tab (change `add-proposals-tab`, archived) holds stories that are not yet in the backlog, but nothing fills it except typing by hand. The team lead wants to draft new stories with Claude: first talk through what is needed against the backlog and `guidelines/product-backlog.md`, then have the agreed stories written to `proposals/<backlog>.csv` to review and accept in the portal. Claude must not be able to touch the real backlog while doing so, and must not write anything the user has not confirmed.

## What Changes

- Two new skills:
  - **`explore-stories`**: a thinking partner for new stories. Reads the guidelines, the backlog and the current proposals, discusses scope, splits and dependencies, and may sketch drafts in the conversation. It never writes a file.
  - **`propose-stories`**: turns agreed stories into proposals. It shows the drafts, asks for a yes/no, and only after the user confirms in a separate message writes them through the writer script.
- A reader script (`read-story-context.mjs`) is the only way either skill reads: it prints the guidelines, `user-stories/<name>`, and `proposals/<name>` when it exists, as data and not instructions.
- A writer script (`write-proposal.mjs`) is the only way `propose-stories` writes. It validates the stories against the guidelines' format and the backlog, assigns `NEW-<n>` IDs by the same rule as the portal, and **adds** them to `proposals/<name>`; it never replaces or removes rows (the user edits that file in the portal). It cannot write anywhere else, and `user-stories/` is only ever read.
- A Bash guard for the skills' locked session: the explore session may run only the reader, the propose session only the reader and the writer.
- Pure input-validation/building logic lives in `src/user-story-generator/` and is unit tested; `CLAUDE.md` and `README.md` describe the skills.
- Out of scope: any change to the portal or the proposals file format; accepting stories (done in the portal); editing or deleting existing proposals from the skills.

## Capabilities

### New Capabilities

- `story-writing-skills`: the explore and propose skills, what each may read and write, the confirmation step, and their reliance on the guidelines.
- `story-proposal-writer`: the writer script's input format, validation, ID allocation, add-only behaviour and the read/write allow-list.

### Modified Capabilities

None. `story-proposals` already defines the file, the `NEW-<n>` IDs and the allocation rule; the writer follows them unchanged.

## Impact

- New: `.claude/skills/explore-stories/` (`SKILL.md`, `read-story-context.mjs`, `guard-bash.mjs`, `locked-settings.json`), `.claude/skills/propose-stories/` (`SKILL.md`, `write-proposal.mjs`, `locked-settings.json`).
- New `src/user-story-generator/proposal-input.js` (pure), tests `test/proposal-input.test.mjs`, `test/write-proposal.test.mjs`, `test/read-story-context.test.mjs`, `test/guard-bash.test.mjs` (extended or split per guard).
- `CLAUDE.md` and `README.md` (skills and the `proposals/` writer).
- No change to `server.cjs`, the portal, the review skill, or the guidelines.
