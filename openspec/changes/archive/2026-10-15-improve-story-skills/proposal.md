## Why

Feedback from a real explore-then-propose session showed gaps in the story skills: the agent could not size stories with the team's guideline because the reader never prints it, it could not fix a proposed story (it had to add a second one, "NEW-8"), the skills say nothing about re-reading the context, and the guidelines do not say how to write a pass mark for subjective qualities such as "relevant". Each costs a rewrite or a guess by the agent.

## What Changes

- `read-story-context.mjs` also prints `ai/guidelines/sprint-points-guideline.md`, right after `product-backlog.md`. Both skills are told to size stories with it and not to restate it.
- `ai/guidelines/sprint-points-guideline.md` loses its "Team Reference Anchors" section (unfilled placeholders; the benchmark table already gives an example per size).
- `product-backlog.md` fixes its stale link to the sprint-points guideline and gains a short note on subjective qualities: a criterion needs a measurable bar (a fixed sample, a threshold, who judges), and what cannot be fixed yet goes in Notes as "to be agreed".
- `write-proposal.mjs` accepts **patches** in the same JSON array: an item with an `"id"` (`NEW-<n>`) changes only the fields it gives, in place; an item without one is a new story as before. The merged story is validated like a new one, and one invalid item means nothing is written. **BREAKING** for the writer's contract: it is no longer add-only.
- `propose-stories` documents patches and always runs the reader first, even if `explore-stories` already did, so a patch builds on the file as it is now (including portal edits).
- `explore-stories` states that proposals it sees can only be changed later through `propose-stories`.
- `ai/launchers/shape-stories.ps1` takes `[backlog] [story]`. The backlog may be given without `.csv` (`data-portal`). The story is one argument (quoted when it has spaces): either a proposal ID of that backlog (`NEW-57`) or free text (`"a new keyboard"`). Whatever is missing, the **script** prompts for (a numbered list of the backlogs in `data/user-stories/`, then a "what story?" line), validates it (unknown backlog, empty story, or a `NEW-<n>` that is not in that backlog's proposals are rejected before Claude starts), and starts Claude with both already filled in. The AI no longer asks which backlog or story to use in a session started this way.
- `guard-bash.mjs` and its tests keep accepting the single documented writer form (no new command form is needed).

Out of scope: deleting proposals, patching backlog stories, trimming the skill list shown to the agent (a Claude Code limitation the launcher cannot filter).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `story-proposal-writer`: the add-only requirement becomes add-and-patch; input format gains the patch form and its validation.
- `story-writing-skills`: both skills size with the sprint-points guideline; explore says proposals change only via propose; propose always runs the reader first and can patch; the `shape-stories.ps1` launcher collects backlog and story itself and hands them to explore.
- `backlog-guidelines`: the sizing requirement points to `ai/guidelines/sprint-points-guideline.md` (not the old `src/` path); acceptance criteria need a measurable bar for subjective qualities.

## Impact

- Code: `.claude/skills/explore-stories/read-story-context.mjs`, `.claude/skills/propose-stories/write-proposal.mjs`, `core/proposal-input.js` (patch validation and merge).
- Launcher: `ai/launchers/shape-stories.ps1`.
- Skill text: `explore-stories/SKILL.md`, `propose-stories/SKILL.md`.
- Docs: `ai/guidelines/product-backlog.md`, `ai/guidelines/sprint-points-guideline.md`; the `CLAUDE.md` paragraph that says the writer "only adds".
- Tests: `test/read-story-context.test.mjs`, `test/write-proposal.test.mjs`, `test/propose-skill.test.mjs`, `test/guard-story-bash.test.mjs`.
- Risk: a patch could overwrite a portal edit made after the agent read the file; the always-re-read rule and the existing "do not edit in the portal while a batch is being written" warning cover it.
