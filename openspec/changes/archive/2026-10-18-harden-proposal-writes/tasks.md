## 1. "As an" and the role field

- [x] 1.1 In `core/story-text.js`, split the story on `As` (`/\bas\b/i`) so `asA` holds the role with its article ("a team lead", "an approver"), compose `As ${asA}, …`, drop the `article` field added earlier, and export `roleIsBlank` (empty, or only `a` / `an`). Update `test/story-text.test.mjs`: "As an" round trip, "As a team lead" gives `a team lead`, a bare article is a blank role. `node --test test/story-text.test.mjs` passes
- [x] 1.2 Remove `article` from `core/model.js`, `core/review.js` and `core/proposal-input.js`; use `roleIsBlank` in the writer's, the review writer's and `storyIssues`' checks; the writer's message shows "As a …, I want …, so that …" and says "As an …" is accepted. Update `test/model.test.mjs`, `test/review.test.mjs` and `test/proposal-input.test.mjs` (the existing asA expectations become `a …`; add "As an" cases and the bare-article case). `npm test` passes
- [x] 1.3 In `StoryForm.jsx`, remove the select and make the first field a single input labelled "As" (placeholder `a team lead`) bound to `asA`; check in the running portal that an "As an" story shows `an approver` in the field and the preview, that typing `a team lead` saves `As a team lead, …`, and that a new story starts empty

## 2. Safe retry and read-back in the proposals writer

- [x] 2.1 In `core/proposal-input.js`, skip new stories whose Epic + Feature + Title (trimmed, case-folded) match a stored proposal: return `skipped` with the matched ID, allocate `NEW-<n>` only to added stories, resolve `NEW-<k>` in Depends On to the added or matched ID, and reject two equal keys in one input. Tests in `test/proposal-input.test.mjs` cover each scenario of "Repeated new stories are skipped" and pass
- [x] 2.2 In `write-proposal.mjs`, split `writeProposal` into a prepare step and a write step, add `checkProposal` (same input and problems, plus IDs it would assign and stories it would skip, no file change), and report skipped stories in the CLI message. Tests in `test/write-proposal.test.mjs` show a check leaves the directory byte-for-byte unchanged and a repeated batch adds nothing
- [x] 2.3 After `writeAtomic`, re-read and parse the proposals file, check every added and patched ID and the row count, build the message from what was read, and fail naming the missing ID otherwise (a test simulates a rename that loses a row). `node --test test/write-proposal.test.mjs` passes
- [x] 2.4 Look at the lexicon and review writers for a separable validate step; if one exists, expose a `check` for each (and the same disk read-back for the lexicon terms and review row count), and if not, record in this file which input `check_drafts` leaves out. Tests for each exposed check show no file changes

## 3. Write log

- [x] 3.1 Add `core/write-log.cjs` (`logWrite({ writer, store, file, text })`: JSON line with time, writer, store, file, bytes, 12-hex SHA-256, appended to `DATA_DIR/logs/writes.jsonl`; a logging error goes to stderr and is not thrown) with a test that uses a temp `TLT_DATA_DIR`: a line is appended, no content is stored, and an unwritable log folder does not throw
- [x] 3.2 Call it from `app/backend/server.cjs` for the file API's write, create and rename with writer `portal`, and from `writeAtomic` and the lexicon, review and suggestion writers with their tool names. Verify against a temp data folder that a portal-style PUT and a `write_proposals` call each add one line, and that `GET /api/logs/x.csv` is rejected as an unknown store

## 4. `read_context` and `check_drafts`

- [x] 4.1 In `.claude/skills/explore-stories/read-story-context.mjs`, add the benched count to the `proposals` section, and add the sections `reviews` (counts per story, or open rows of `storyIds`) and `lexicon-suggestions` (open rows, decided count) to `SECTIONS`, the menu, the CLI usage and `formatSection`; reject `storyIds` with another section. Cases in `test/read-story-context.test.mjs` cover each scenario of "Reads that can verify every writer" and pass
- [x] 4.2 In `ai/mcp/story-tools.mjs`, register `check_drafts` (not in `--read-only`), add `storyIds` and the two sections to `read_context`, and update the `write_proposals` description (User Story starts `As a` or `As an`; a repeated new story is skipped; remove "added twice"). `test/story-tools-mcp.test.mjs` checks the tool list, both read-only cases and the new description text, and passes
- [x] 4.3 Add `mcp__story-tools__check_drafts` to `--allowedTools` in `ai/launchers/shape-stories.ps1` (not `explore-stories.ps1`, which runs the read-only server) and to `allowed-tools` in `propose-stories/SKILL.md` and `.claude/commands/story/propose.md`; verify with `grep` that the writers are still not listed

## 5. Skills

- [x] 5.1 Update `.claude/skills/propose-stories/SKILL.md` and `.claude/commands/story/propose.md`: call `check_drafts` before the yes/no; after each writer call read that file back with `read_context` in the same turn and report "written" only on a match; replace "Run each call once" with the recovery rule (say what is missing, resend only the missing part; proposals repeats are skipped); never repeat an earlier "written" without a read; state the `As a` / `As an` rule up front. `test/propose-skill.test.mjs` is extended to assert these lines are present and passes
- [x] 5.2 Update `README.md` and `CLAUDE.md` where they describe the five tools, the writers' "added twice" behavior, `read_context` sections and the data folders (add `logs/`, not a store). Re-read both and confirm no statement is left that contradicts the specs

## 6. Whole-change check

- [x] 6.1 Run `npm test` (all pass), `npm run build`, and `openspec validate harden-proposal-writes`; then replay the failing session against a temp data folder: `check_drafts` on two "As an approver" stories passes, `write_proposals` adds four, sending the same four again skips all four, and `data/logs/writes.jsonl` shows the one write (the repeat changes no file, so it logs nothing)
