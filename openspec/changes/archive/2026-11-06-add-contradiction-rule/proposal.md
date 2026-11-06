# Proposal

## Why

When a new story contradicts a story already in the backlog, or a page of the project's wiki, `jois-story-explore` and `jois-story-propose` give no guidance, so they may drop the new story or quietly ignore the old one. This is PR 2 of issue #98 ("finish the story-to-code pipeline"). It is needed before `jois-story-verify` (PR 3) and archive (PR 8), because both rely on the record of changes that this change defines.

The two skills also cannot find a contradicting wiki page today. They have no file-reading tool except one script that reads backlog data, and neither mentions `wiki/`.

## What Changes

- Add **the contradiction rule** to `jois-story-explore` and `jois-story-propose`, and use it in the Conflicts section of `jois-story-plan`. When a new story contradicts an earlier story or a wiki page, the skill:
  1. says plainly that it contradicts, and names the story (by Title) or the wiki page;
  2. leaves the decision to the user about which one stands;
  3. if the new story wins, changes the old spec instead of leaving it standing, and records the change as an entry of the slice's "Changes to existing specs";
  4. never edits a frozen story: the new story supersedes it.
- Add a `## Changes to existing specs` section to the slice document (`UC-<slice>.md`). Each entry is marked `added`, `modified` or `removed` and names the wiki page by its path under `wiki/`. Archive (PR 8) applies the entries later, the way `opsx:archive` applies delta specs.
- Define the section in `planner/guidelines/diagram-conventions.md`, regenerate the plan skill's copy, and make the slice checks require the section and validate its rows.
- Give `jois-story-explore` and `jois-story-propose` the tools `Read`, `Grep` and `Glob`, as `jois-story-plan` already has, so they can look for a contradicting wiki page. `read-story-context.mjs` stays the default way to read backlog data. The wiki lookup order is: the `CLAUDE.md` "Where the docs are" table, then `wiki/Home.md` and the topic pages, then `Grep` on `wiki/`. `wiki/` is read relative to the current folder. A project with no `wiki/` is told in one line to run `jois-init:docs`.
- Update the sample slice fixture, the skill tests, the specs and the wiki pages that describe the skills.

**Builds on PR 1.** PR 1 (freeze stories, unique IDs) has landed. It makes a frozen story read-only and permanent, and leaves "a superseding story" to a later change, which is this one. A superseding story is a new story whose Notes carry `Supersedes: <ID> <Title>`. The frozen story stays frozen and unmarked.

## Capabilities

### New Capabilities
- `story-contradiction-rule`: the four-step rule, how a contradicting story or wiki page is found, and the record of the outcome. It is one durable behavior shared by three skills, so it is stated once and the other specs point to it.

### Modified Capabilities
- `story-writing-skills`: the explore and propose requirements gain the file-reading tools and cite the contradiction rule.
- `plan-stories-skill`: the "Conflicts are offered a way to be fixed" requirement covers a conflict with a wiki page and records an accepted change in "Changes to existing specs"; the draft step writes that section.
- `diagram-conventions`: the specification content and design sections gain `## Changes to existing specs`, with its table and checks.
- `toolkit-story-skills`: "Reading uses ordinary file tools" now holds for explore and propose too, not only for the plan skill.
- `frozen-stories`: "Frozen stories are reference only" no longer says the superseding story is left to a later change; a change to a frozen story is made by a new superseding story.

## Impact

- **Skill files:** `toolkit/skills/jois-story-explore/SKILL.md`, `jois-story-propose/SKILL.md` and `jois-story-plan/SKILL.md` (frontmatter and body); `toolkit/skills/jois-story-plan/diagrams/checks.js`.
- **Guidelines:** `planner/guidelines/diagram-conventions.md`, and the generated copy `toolkit/skills/jois-story-plan/references/diagram-conventions.md` (written by `planner/scripts/sync-skill-logic.mjs`, never edited by hand).
- **Tests:** `toolkit/tests/story/` (explore, propose and plan skill tests, `allowed-tools.test.mjs`, `diagram-checks.test.mjs`, `diagram-scripts.test.mjs`) and the fixture `toolkit/tests/story/fixtures/sample/slices/sign-in/UC-sign-in.md`.
- **Docs:** `wiki/planner/Story-Skills.md` and `wiki/planner/architecture/Story-Skills-Internals.md`; `python scripts/check_docs.py` must pass.
- **Specs:** the five capabilities above, including `frozen-stories` from PR 1.
- **Related work:** PR 3 (`jois-story-verify`) will check the new section.
- **Not changed:** the portal, `planner/logic/`, the CSV model, `write-freeze.mjs` and the story writers. There is no new dependency.
