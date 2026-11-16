# Tasks

## 1. Freeze writer refuses an unready story

- [x] 1.1 In `toolkit/skills/jois-story-plan/write-freeze.mjs`, refuse a story with an open clarification, using the synced `lib/backlog/story-text.mjs` counting (`parseClarifications`, `openCount`) on the story's `Clarifications` cell, so it lands in `refused` with the open questions named and the other stories still freeze. Verify with the new tests of 1.2.
- [x] 1.2 Add tests to `toolkit/tests/story/write-freeze.test.mjs`: an open question refuses only that story (write and `--check`), an all-answered story freezes, a story with no pairs freezes, and free-text clarifications that do not parse are not read as open. Verify with `node --test <abs>/toolkit/tests/story/write-freeze.test.mjs`.

## 2. Plan skill checks readiness and scope

- [x] 2.1 In `toolkit/skills/jois-story-plan/SKILL.md`, add the readiness check after the scope is named and before the design checkpoint: list stories with open clarifications by Title with their questions, leave them out of the slice and freeze, name `jois-story-propose` for the resolve, carry on with the ready stories and stop when none remain. Verify by reading the section against the "Plan checks that each story is ready" scenarios.
- [x] 2.2 In the same file, add the scope question to the design checkpoint: per story, list its criteria and ask whether the slice builds all of them; for a story built in part, leave it out and offer a split through `jois-story-propose` (the story keeps the built criteria, a new unfrozen story takes the rest and depends on the first), and never write the split itself. Update the sentence before the yes/no so it names the stories left out and why. Verify against the "Plan checks that the slice builds each story in full" scenarios.
- [x] 2.3 Add checks to `toolkit/tests/story/plan-skill.test.mjs` that the skill text holds the readiness check, the scope question and the split offer, in the style the file already uses. Verify with `node --test <abs>/toolkit/tests/story/plan-skill.test.mjs`.

## 3. Documentation

- [x] 3.1 Update `wiki/Story-To-Code.md` (the Plan step), `wiki/viewer/Story-Skills.md` and `wiki/viewer/architecture/Story-Skills-Internals.md` to say a story is frozen only when ready and built in full, that plan leaves out unready or partly built stories, and how a split works. Verify with `python scripts/check_docs.py`.

## 4. Integration

- [x] 4.1 Run the toolkit and story tests for the whole change and complete any fixes the failures need: `cd viewer; npm test; npm run typecheck` and `node --test <abs>/toolkit/tests/story/*.test.mjs`, and `cd toolkit; python check_toolkit.py`. Verify that every command exits 0.

## Workflow follow-up

- Live-test the edited plan skill in the sample's mock repo as `CLAUDE.md` describes, at the `accepted` stage with one story given an open question; this needs a model run, so ask the user first.
- Archive the change with `/opsx:archive` once the tasks are done.
