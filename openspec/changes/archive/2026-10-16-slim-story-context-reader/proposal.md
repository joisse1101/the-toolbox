## Why

`read-story-context.mjs` prints the guidelines, the whole backlog, the proposals and the lexicon in one go. For `data-portal.csv` that is about 32.6 KB, of which the backlog is 23 KB, mostly its long cells (User Story, User Acceptance Criteria, Clarifications). That is over the Bash tool's output cap, so the session sees a truncated preview, and the only way to see the rest (reading the saved temp file) is denied by the guard, which allows nothing but the reader scripts. The guard is right to be that strict, and the backlog will only grow, so the reader has to shrink what it prints rather than the guard widening what it allows.

## What Changes

- `read-story-context.mjs <file>` prints the backlog as an **index**: `ID, Epic, Feature, Title, User Story, Sprint points, Depends On, Locked`, one row per story. The long cells (`User Acceptance Criteria`, `Clarifications`, `Notes`, `Priority`) and unknown columns are left out. The guidelines, proposals (in full) and lexicon are printed as before.
- New form `read-story-context.mjs <file> <ID>` prints the backlog's header and that one story, every column, labelled as data. An ID not in the backlog is an error.
- `guard-bash.mjs` allows one optional strict `<ID>` after the file name, in both modes. Flags, extra arguments, pipes and every other command stay denied.
- The two `SKILL.md` files and `/story:propose` say that the backlog is an index and that the full story comes from the `<ID>` form; the skills fetch a story in full before showing it, patching it or writing a review row for it.
- `CLAUDE.md` describes the index and the `<ID>` form.

Nothing is written by the reader, no new file is reachable, and the proposals are not slimmed (a patch builds on the full file).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-writing-skills`: the "Read and write access is locked down" requirement gains the index output and the `<ID>` form of the reader, and the guard allows that form.
- `story-clarifications`: "Answered clarifications inform refinement" still holds for proposed stories (printed in full); for a backlog story the Clarifications come with the `<ID>` form.

## Impact

- Code: `.claude/skills/explore-stories/read-story-context.mjs`, `.claude/skills/explore-stories/guard-bash.mjs`.
- Tests: `test/read-story-context.test.mjs`, `test/guard-story-bash.test.mjs` (the explore/propose guard; `test/guard-bash.test.mjs` is the review skill's guard and is untouched).
- Docs: `.claude/skills/explore-stories/SKILL.md`, `.claude/skills/propose-stories/SKILL.md`, `.claude/commands/story/propose.md`, `CLAUDE.md`.
- No change to data files, the portal, the writers or `read-backlog.mjs` (the review skill's reader).
