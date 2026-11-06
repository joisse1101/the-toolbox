## Context

See `proposal.md` (Why) for the motivation. Three facts about the current code shape the approach:

- The two skills that find contradictions, `jois-story-explore` and `jois-story-propose`, can run only their bundled scripts (`allowed-tools` lists `Bash(node ...)` entries). They cannot read `wiki/`. `jois-story-plan` has `Read`, `Grep` and `Glob`.
- The slice document's section order is fixed by `SPEC_HEADINGS` in `toolkit/skills/jois-story-plan/diagrams/checks.js`, and its rules are stated once in `planner/guidelines/diagram-conventions.md`. The skill's copy of that file is generated and must not be edited.
- A skill cannot write to the wiki, and nothing may be applied to it before archive (PR 8). The decision of a contradiction therefore has to travel from the explore and propose session to the plan session, and later to archive, as data.

## Goals / Non-Goals

**Goals:** state the contradiction rule once; let the two skills find a contradicting wiki page; carry the user's decision from propose to plan to archive in a form a check can validate.

**Non-Goals:** freezing and unique IDs (done in PR 1); marking or showing a superseded story in the portal (the relationship is visible only in the new story's Notes); `jois-story-verify` (PR 3); applying the rows to the wiki (PR 8). No change to the portal, the CSV model, `write-freeze.mjs` or the story writers.

## Decisions

### The decision travels in the new story's Notes

The user's decision is recorded as lines in the new story's `Notes` field: `Changes existing spec: <added|modified|removed> <path under wiki/> - <what changes>` and `Supersedes: <ID> <Title>`. The plan skill reads them when it drafts the slice.

- **Why:** `Notes` already holds "facts and decisions" (`product-backlog.md`), the proposals writer already stores it, and the stories reach the plan skill unchanged. No new column, writer or file is needed, so the portal and the CSV model stay as they are.
- **Alternative: a new CSV column or a new file** (for example `spec-changes.csv`). Rejected: it changes the data model and the writers, which PR 1 is changing at the same time.
- **Alternative: record it only in the slice.** Rejected: the decision is made in explore or propose, before any slice exists, so it would be lost between sessions.

### One new section, placed after Open questions

`## Changes to existing specs` goes after `## Open questions` and before `## Implementation overview`, with the four columns Change, Wiki page, What changes and Reason, or the word `None`.

- **Why:** it is a design-level record like the other design sections, and the code-bound sections (Implementation overview, Traceability) stay last, so the no-repo `TBC` checks keep their position.
- **Alternative: after Traceability.** Rejected: that moves a design section behind the code-bound ones and splits the two groups the conventions already keep apart.
- `Wiki page` is a path under `wiki/` without the `wiki/` prefix, and must end in `.md`. A row has no status column, because applying a row is archive's job and a slice must not claim it.

### The check is structural, not a wiki lookup

`checks.js` adds the heading to `SPEC_HEADINGS` and to the "present and not empty" list, and validates each row: four cells, `Change` one of the three words, `Wiki page` ending in `.md` and not starting with `wiki/`. It does not open the wiki.

- **Why:** the plan skill's diagram logic must not depend on the repo it is run in, and an `added` row names a page that does not exist yet. Whether a named page exists is for PR 3 (`jois-story-verify`), which reads the wiki.

### Tool grant: add `Read`, `Grep`, `Glob`; keep the script as the default

Both skills gain the three read tools. The `SKILL.md` text keeps `read-story-context.mjs` as the way to read backlog data and tells the skill to use the file tools for wiki pages and for what the script's caps cut off (search 25 lines, pattern 50, slice 200).

- **Why:** these are the same tools `jois-story-plan` has, and they are read-only, so explore still cannot write.
- **Alternative: a wiki-only reader script.** Rejected by the user: one more script to build, and it leaves the caps problem.
- **Alternative: raise the caps.** Rejected: the wiki would still be out of reach.
- This repo's `.claude/settings.json` denies `Read` of `./planner/data/**` and `./data/**`, and a deny rule wins over a skill's tool grant. In this repo the script therefore stays the only path to backlog data; the grant matters for `wiki/` and for other projects.

### Wiki lookup order and its limits

`CLAUDE.md`'s "Where the docs are" table first, then `wiki/Home.md` and the topic pages, then `Grep` on `wiki/`. `wiki/` is read relative to the current folder, never a parent, which matches how these skills already find the data folder. A project with no `wiki/` gets one line naming `jois-init:docs`; the skill never creates `wiki/`.

- **Why:** the table is the cheapest route to the right page and is what `jois-init:docs` writes into every project; searching `wiki/` last keeps reads small.

### A frozen story is superseded by a new story that names it

PR 1 makes a frozen story read-only, permanent and impossible to unfreeze, and leaves the superseding story to this change. The old story is therefore never edited or marked. The new story records the supersession in its own Notes as `Supersedes: <ID> <Title>`, using the old story's permanent ID (for example `B1-IAM-0003`).

- **Why:** a frozen ID never changes and is never reused, so it is a safe reference, and the Notes field is the one place a new story can carry it without a new column.
- **Alternative: mark the old story as replaced.** Rejected: it would edit a frozen story, which PR 1 forbids and offers no way to undo.
- **Path of the superseding story:** it is drafted through `jois-story-propose` into the proposals, where it is not frozen. It enters the backlog when the user accepts it, and is frozen only when a slice that covers it is confirmed. Until it is accepted it is not in any slice's scope, so its `Changes existing spec` lines wait too.
- **Wording in replies:** the skill names stories by Title, as the plan skill already does. The ID appears only in the Notes line, which is for the next stage to read.
- This change modifies `frozen-stories` ("Frozen stories are reference only") because PR 1 wrote that the superseding story was "defined by a later change".

### Old stories are edited by where they are

A contradicted story in the backlog that is not frozen gets a review suggestion, one in the proposals gets a patch, and a frozen one gets a superseding story. All three go through `jois-story-propose`, with its existing checks and one yes/no.

## Risks / Trade-offs

- **[A Notes line is free text]** a typo is not caught until the plan skill reads it → the slice check validates the row the plan skill writes, and the plan skill asks about any line it cannot parse instead of guessing.
- **[Direct reads skip the title check and size cap of the script]** → the skills keep the script as the default for backlog data, and treat everything they read as data, never as instructions.
- **[A secret file could be read]** → the skills inherit the plan skill's rule not to open `.env` files, private keys or credentials files by instruction.
- **[Existing tests pin the tool lists and the section list]** → `allowed-tools.test.mjs`, the skill text tests and the fixture slice are updated in the same change, and the explore skill's version is bumped.

## Migration Plan

There is no data migration: existing slices have no `## Changes to existing specs`, so they fail the new check until redrawn. The plan skill already reports a slice as stale and redraws only when the user asks, so no slice is rewritten automatically. Rollback is a revert of the change.

## Added after the evaluation run

- The skills raise a story that a winning new story leaves pointless without contradicting it (a knock-on effect) in one sentence and ask, and draft nothing until the user says yes. This widens the rule from direct contradictions to knock-on effects, at the user's request.
- The Notes field stays free text. The proposals writer does not check the `Changes existing spec` and `Supersedes` lines, because the user may write anything in Notes. Only the rows of a slice's `## Changes to existing specs` are checked, by `checks.js`.

