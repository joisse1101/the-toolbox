# Design

## Context

See proposal.md for why. The plan skill already holds every check verify needs, as scripts: `read-diagrams.mjs` reports a slice as stale, and `write-diagram.mjs --check` runs the document, diagram and task checks. A skill's `allowed-tools` must match every `node` command its text documents (`toolkit/tests/story/allowed-tools.test.mjs`), and `/jois-story:review` already finds another skill's scripts by loading that skill with the Skill tool. Open clarification questions are in the `Clarifications` column, which `read-story-context.mjs` (propose, explore) and `read-backlog.mjs` (review) can print.

## Goals / Non-Goals

**Goals:**
- One read-only pass over a written slice that ends in a ranked report.
- Fixes written only through existing writers, each after one approval.

**Non-Goals:**
- Ticking tasks, a saved report, a "ready to build" verdict and a slice-to-code comparison. Apply (PR 4) and validate decide later whether they need a stored result.
- Any new script. If the plan skill cannot hand a check's result over as data, the smallest read-only addition to it is made in this change and named in the task that makes it.

## Decisions

### Verify is instructions only, with no scripts of its own

The skill is a `SKILL.md` and the command a `.md`. Every check is a call to a script that the plan or review skill owns, found by loading that skill. This keeps one copy of the Mermaid packages and of the check code, and a plan-skill change reaches verify without a second edit. The alternative was a verify skill with its own `lib/` copy built by the sync script. It would work on its own, but it adds a second `npm ci` and a second place for the checks to drift. A verify skill that needs the plan skill installed is a fair price, because a slice cannot exist without it.

### Checks that need judgment are done by the model and shown to the user

Stale slice, the document checks and criteria without tasks come from the plan scripts as data. The `TBC` decisions, the open questions and the tasks that wait on them are found by reading `UC-<slice>.md`, `tasks.md` and the stories' `Clarifications`, because no script reports them today. Each finding names its source (the decision id, the question, the task id) so the user can check it. The alternative was a new report script in the plan skill. I'd add one only if the reading proves unreliable, since it would be tested code that other stages (apply, archive) can reuse.

### Findings are routed by what they belong to

A finding belongs to the slice, to a story, or to the user's own decision.

- **Slice:** corrected and written through `write-diagram.mjs`, the same path the plan skill uses, so the checks and the all-or-nothing write apply.
- **Story:** a suggestion in `review.csv` through `write-review.mjs`, shown in the story editor. Stories are not edited because the editor autosaves the backlog CSV and a second writer would clash, which is also why the review skill never edits it.
- **User's decision** (a `TBC` decision, an owner): asked as a question and never filled with a default, as the plan skill does.

### Ranking

Critical findings are those that make the slice unsafe to build from: stale, failing a check, or a criterion with no task. Warnings are open questions the team can still settle while building. This matches OpenSpec's verify and gives PR 4 a ready meaning for "block apply" without deciding it here.

## Risks / Trade-offs

- [Verify depends on `jois-story-plan` being installed] → It stops with a clear message, as the propose command does for its skill.
- [A check done by reading may miss a `TBC` that is worded differently] → The plan skill's conventions fix the spelling of the decision source, and verify reports the checks it ran so a silent skip is visible.
- [A correction rewrites the whole slice, so a hand edit made after verify read the slice could be lost] → Verify rereads the slice just before showing the correction, and the plan writer carries ticks over from the file on disk.
- [After PR 1 freezes stories, the stale check will rarely fire] → It stays, because slices written before the freeze and hand-edited CSVs still need it.
