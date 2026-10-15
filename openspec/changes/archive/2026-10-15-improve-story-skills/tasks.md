## 1. Guidelines

- [x] 1.1 Remove the "Team Reference Anchors" section from `ai/guidelines/sprint-points-guideline.md`; verify with a search that no `<e.g.,` text remains in the file
- [x] 1.2 Fix the sprint-points link in `ai/guidelines/product-backlog.md` section 3 to resolve to `sprint-points-guideline.md` next to it; verify the relative link points at an existing file
- [x] 1.3 Add the measurable-bar note to section 5 of `ai/guidelines/product-backlog.md` (fixed sample, threshold, who judges; unknown values go in Notes as "to be agreed"; reviewer judgement alone is not a bar); verify it names no rule that the skills restate

## 2. Reader prints the sprint-points guideline

- [x] 2.1 In `read-story-context.mjs`, read `sprint-points-guideline.md` in `readStoryContext`, return it, and print it after the product-backlog guidelines in `formatContext`; update the header comment; verify with new cases in `test/read-story-context.test.mjs` (both guidelines printed in order, missing sprint-points file reports the file and prints nothing else)

## 3. Writer accepts patches

- [x] 3.1 In `core/proposal-input.js`, split input items by the presence of `id`; check a patch's keys (allowed fields plus `id`; reject `priority`, `code`, `benched`, unknown keys, an empty patch, a duplicate `id`, a non-`NEW-<n>` id, an id not in the proposals file, and a benched story); verify with unit tests for each rejection
- [x] 3.2 Rebuild the stored story to the input shape, overlay the patch, and validate the merged story with the existing field checks (a stored cell that does not parse and is not replaced by the patch is rejected naming the field); verify with tests: change one field, replace a list as a whole, clear Notes, invalid merged story
- [x] 3.3 Resolve patch Depends On with the three existing forms and run cycle detection over backlog, patched proposals and new stories; verify with tests for a patch and a new story that depend on each other, a self-dependency and a cycle through a patch
- [x] 3.4 In `write-proposal.mjs`, apply patches in place (keep ID, position, unknown columns and Benched), append new stories, write once atomically, and report the IDs added and patched; update the header comment; verify with `test/write-proposal.test.mjs` (untouched rows byte-identical, rejected run writes nothing, mixed run writes both or neither, add-only input still works)
- [x] 3.5 Confirm `guard-bash.mjs` allows the writer form with patches unchanged; verify with a case in `test/guard-story-bash.test.mjs` that a heredoc holding a patch is allowed and that no other form became allowed

## 4. Skill text

- [x] 4.1 `explore-stories/SKILL.md`: sizing by the sprint-points guideline the reader prints; proposals change only through `propose-stories`; fix list of what the reader prints; verify against the `story-writing-skills` scenarios by reading the file
- [x] 4.2 `propose-stories/SKILL.md`: always run the reader first (and why), patch form with an example, show old and new values for a patch before the yes/no, prefer a patch to a second story, sizing by the guideline, the report names patched IDs; verify with `test/propose-skill.test.mjs` updated for the new text

## 5. Launcher

- [x] 5.1 `ai/launchers/shape-stories.ps1`: parameters `[backlog] [story]`, `.csv` normalization, existence check, `NEW-<n>` must exist in that backlog's proposals, `Read-Host` prompts for missing values with a numbered backlog list, opening prompt carries both; update the header comment; verify by running it with no args, backlog only, backlog + `NEW-57`, backlog + quoted free text, an unknown backlog and a `NEW-n` missing from the proposals
- [x] 5.2 `explore-stories/SKILL.md` Input: when the opening prompt carries a backlog and a story, use them without asking, and for `NEW-<n>` find it in the proposals; and when launched without them, ask in a fixed order (choice question for the backlog, one plain-text line for the story) and open a `NEW-<n>` story on its current text; verify by reading the file against the "Shape-stories launcher" and "Proposed story opens on its current text" scenarios
- [x] 5.3 Add `claudeMdExcludes` (the repo `CLAUDE.md` and the user-level `.claude/rules/**`, as the portable globs `**/CLAUDE.md` and `**/.claude/rules/**` so no user name or install path is committed) to the `locked-settings.json` of `explore-stories`, `propose-stories` and `review-backlog`, so launcher sessions do not load them; verify with `/context` in each launcher session (no memory files listed, about 3.7k fewer tokens) and that the session's skill still runs; if the user-level rules are still loaded, report it rather than widening the scope

## 6. Docs and check

- [x] 6.1 Update the `CLAUDE.md` paragraph that says the writer only adds so it describes add-and-patch, the reader's extra output, the always-re-read rule and the launcher's `[backlog] [story]` arguments and prompts; verify no other file still says "only adds"
- [x] 6.2 Run `npm test` and `openspec validate improve-story-skills --strict`; verify both pass
