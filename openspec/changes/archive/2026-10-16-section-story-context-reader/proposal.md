## Why

`read-story-context.mjs <file>` prints the two guidelines, the backlog index, the proposals and the lexicon in one result. For the data-portal backlog that is 29.7 KB, just over the Bash result cap (about 30,000 characters). The harness then saves the output to a file and shows only a 2 KB preview, and the locked sessions have no way to read that file (the guard allows nothing but the reader). The skills therefore cannot see the proposals or the lexicon. The proposals and the lexicon only grow, so trimming the output once would fail again.

## What Changes

- `read-story-context.mjs <file> --section guidelines|index|proposals|lexicon` prints one section per call. `guidelines` is `product-backlog.md` then `sprint-points-guideline.md` (about 7 KB); `index`, `proposals` and `lexicon` are the parts the all-in-one output already printed, with the same labels.
- **BREAKING**: `read-story-context.mjs <file>` with no section no longer prints everything. It prints a menu of the four sections with their sizes in characters, the Bash result cap, and the command for each section. This is deliberate: the all-in-one call is the one that overflows.
- `read-story-context.mjs <file> <ID>` (one backlog story in full) and the no-argument backlog list are unchanged.
- `guard-bash.mjs` allows exactly `read-story-context.mjs <file> --section <one of the four words>`, in both modes, and still denies every other flag, extra argument and shell syntax.
- `explore-stories` and `propose-stories` (and `/story:propose`) read the context as separate section calls instead of one call. `propose-stories` still re-reads the proposals at the start of every use.
- The header comment of the reader, `CLAUDE.md` and the tests are updated to match.

Not in scope: paging or filtering a section that alone exceeds the cap (for example a very large proposals file), launcher-injected guidelines, and any way for the guard to read saved tool results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-writing-skills`: the "Read and write access is locked down" requirement (reader output and the guard's allowed reader forms) and the "Sizing comes from the sprint-points guideline" requirement (the guidelines now come from their own section call).

## Impact

- `.claude/skills/explore-stories/read-story-context.mjs`, `.claude/skills/explore-stories/guard-bash.mjs`
- `.claude/skills/explore-stories/SKILL.md`, `.claude/skills/propose-stories/SKILL.md`, `.claude/commands/story/propose.md`, `CLAUDE.md`
- `test/read-story-context.test.mjs`, `test/guard-story-bash.test.mjs`, and any assertion in `test/propose-skill.test.mjs` on the skills' wording
- `ai/launchers/*.ps1` need no change: they allow the reader by the `read-story-context.mjs:*` prefix.
