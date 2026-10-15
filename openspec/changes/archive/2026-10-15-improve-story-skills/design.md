## Context

See proposal.md for motivation. Current state that shapes the approach:

- `core/proposal-input.js` (`buildProposals`) is pure: it takes the parsed input, the backlog and the proposals, and returns new stories or errors by position. `write-proposal.mjs` loads files, calls it, appends the rows and writes atomically (temp file, then rename). Only appending is supported today.
- Placeholder numbering, dependency resolution (`NEW-<k>`, `proposed:NEW-<n>`) and cycle detection (`backlogProblems` in `core/ids.js`) already live in `buildProposals`.
- `read-story-context.mjs` has `readStoryContext` (returns data) and `formatContext` (prints). It already filters benched stories out of the proposals it prints.
- `guard-bash.mjs` allows exactly one heredoc of JSON for the writer; the heredoc content is not inspected.
- Core logic is pure and tested with `node --test`; there are no DOM tests.

## Goals / Non-Goals

**Goals:**
- A patch changes only the fields it names, in place, and the result is validated exactly like a new story.
- One writer command, one atomic validation, whatever mix of patches and new stories the input holds.
- The agent gets sizing benchmarks from the same reader call it already makes.

**Non-Goals:**
- Deleting or reordering proposals, patching backlog stories, or any new command form for the guard.
- Merging concurrent edits: the writer does not detect a portal edit made after the agent read the file.
- Filtering the skill list the agent sees.

## Decisions

**1. Patches live in `buildProposals`, not in a second function.** The input list is split by the presence of `id`. Rationale: dependency resolution, numbering and cycle checks need to see new stories and patched stories together (a new story may depend on a patched one, a patch may point at a new story). Alternative: a separate `applyPatches` run before `buildProposals` - rejected, it would validate in two passes and could leave a half-valid state or miss cycles that span both.

**2. Validate the merged story by reusing `checkFields`.** A patch's own keys are checked for allowed names (`epic, feature, title, userStory, points, dependsOn, criteria, notes`, plus `id`). The patched story is rebuilt as a full raw object (stored fields rendered back to the input shape, overlaid with the patch) and run through the same field checks, so the format rules exist once. Alternative: validate only the given fields - rejected, it would let a patch skip checks that depend on other fields and duplicates the rules in two places. `REQUIRED` is enforced on the merged object, not on the patch.

**3. Stored story -> input shape through the existing text helpers.** `userStory` is composed with `core/story-text.js` and criteria are rendered one per `AC<n>:` line, so a round trip through the checker is lossless. Stories whose stored text does not parse (portal "raw text" cells) cannot be rebuilt; a patch that does not replace that field is rejected with a message naming the field, rather than silently overwriting the user's raw text.

**4. Patching replaces fields on the stored story object and keeps everything else.** Only the fields named by the patch are assigned; `code`, `cells` (unknown columns) and the Benched column are untouched, and the row stays at its index. Rows the input does not name are not re-serialized differently from today (same `serializeBacklog` path as the append).

**5. Dependency entries in a patch use the same three forms.** `NEW-<k>` counts new stories of the input only (not patches); `proposed:NEW-<n>` may name any proposal, including the patched story's neighbours. A patched story may not depend on itself. Cycle detection runs over backlog + proposals-with-patches + new stories, and reports the offending item by input position.

**6. Reader prints the sprint-points guideline as a labelled section after the product-backlog one.** `readStoryContext` returns `sprintPoints` and `formatContext` adds `=== guidelines/sprint-points-guideline.md ===`. A missing file fails like a missing product-backlog guideline. Alternative: let the skills open the file - rejected, it breaks the "read only through the reader" boundary the guard enforces.

**7. Always re-read, stated in SKILL.md.** `propose-stories` Input step says to run the reader at the start every time and why (patches build on the current file). No code is involved; the writer cannot tell how fresh the agent's view is. Alternative: a content hash the agent echoes back for stale-edit detection - rejected as YAGNI for a single-user local tool; revisit if lost portal edits are reported.

**8. Guideline edits.** Remove "Team Reference Anchors" from the sprint-points guideline; fix the stale `src/user-story-generator/` link in `product-backlog.md`; add the measurable-bar note beside the existing "Unambiguous and objective" bullet in section 5, with the "to be agreed in Notes" fallback.

**9. The launcher resolves backlog and story; the skill only consumes them.** `shape-stories.ps1 [backlog] [story]` normalizes the backlog name (append `.csv` if missing, check it exists in `data/user-stories/`), takes the second argument as the story (one argument, quoted when it has spaces), and prompts with `Read-Host` for what is missing (a numbered backlog list, then the story). A story matching `NEW-<n>` must exist in that backlog's `data/proposals/<backlog>.csv`, otherwise the script reports it and starts nothing. The opening prompt is `/explore-stories <file> <story>`; for a `NEW-<n>` story, `explore-stories` finds it in the proposals the reader prints and treats it as the story to refine. Alternative: leave the prompting to the AI - rejected, it costs a model turn for a lookup the script can do and makes the flow less predictable.

## Risks / Trade-offs

- [The story text goes into the opening prompt] -> it is the user's own request, so SKILL.md treats it as such; CSV cell text stays data, never instructions.

- [A patch overwrites a portal edit made after the agent's read] -> the skill re-reads first and the existing warning not to edit in the portal during a write stays; the confirmation step shows old and new values, which exposes a stale view.
- [Rebuilding the merged story from stored fields drifts from what the portal stores] -> a test round-trips each stored story through the rebuild and expects no change when the patch repeats current values.
- [Patch/new-story position confusion in error messages] -> errors keep naming the item by its position in the input, and say "patch for NEW-n" or "story" so the agent can fix the right one.
- [Benched stories are hidden from the skills, so they may be patched blindly] -> the writer reads the real file and rejects a patch naming a benched story, with a message that it is benched, respecting the user's parking decision.
- [Larger writer surface] -> one new input form, no new command, no guard change.

## Migration Plan

No data migration: proposals files keep their format. Existing add-only input keeps working unchanged (an item without `id` is a new story). Rollback is reverting the commits; no file written by a patch differs in format from one written by an append.
