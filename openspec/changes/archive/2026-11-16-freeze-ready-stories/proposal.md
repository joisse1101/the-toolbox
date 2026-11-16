# Proposal

## Why

Plan freezes every story its slice covers, and a frozen story is read-only, including its Clarifications. A story frozen with an open question can therefore never have that question answered, and archive refuses any story with an open question, so its slice is stuck for good. A slice also cannot build part of a story: plan draws every acceptance criterion (AC) of every story in scope, so a stub that builds only "save the log locally" has no way to leave out "sync the log to the cloud", and the freeze would hide the unbuilt part inside a story that can no longer be split.

## What Changes

- A story is **ready** when it has no open clarification. Plan reads the clarifications of every story in scope before it drafts, lists the unready ones, and leaves them out of the slice and the freeze. It names `jois-story-propose` as the way to resolve each question.
- `write-freeze.mjs` refuses a story with an open clarification, as it already refuses a story with no ID, so the rule holds even if the skill text is ignored.
- Plan asks, once per story in scope, whether the slice builds every acceptance criterion of that story. When it does not, plan leaves the story out of the slice and offers a split through `jois-story-propose`: the story keeps the ACs the slice builds, and a new, unfrozen story takes the rest and depends on the first. The user accepts the split in the portal and runs plan again.
- A frozen story means one the slice builds in full. A story found too big after the freeze is handled by a superseding story, as `frozen-stories` already says.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frozen-stories`: a story is frozen only when it is ready, and only when its slice builds all of it.
- `plan-stories-skill`: plan checks readiness and scope per story before it drafts, excludes the stories that fail, and offers a split or a resolve through `jois-story-propose`.

## Impact

- `toolkit/skills/jois-story-plan/SKILL.md` (input, scope and freeze sections) and `toolkit/skills/jois-story-plan/write-freeze.mjs`.
- `toolkit/tests/story/write-freeze.test.mjs` and `toolkit/tests/story/plan-skill.test.mjs`.
- Wiki pages `wiki/Story-To-Code.md`, `wiki/viewer/Story-Skills.md` and `wiki/viewer/architecture/Story-Skills-Internals.md`.
- The sample under `toolkit/sample/story-to-code/` is unchanged; a saved stage that holds an open clarification on a frozen story, if any, would need recording again, which costs model tokens, so it needs the user's approval first.
