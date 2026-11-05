# Proposal

## Why

The docs process is set up, but `wiki/` holds only empty starter pages. `python scripts/check_docs.py` fails with 30 problems, all in `CLAUDE.md`, because its Architecture section names files by paths that only make sense inside a sub-folder. At the same time the knowledge sits in three overlong places: `CLAUDE.md` (dense lines), the root `README.md` (158 lines) and `toolkit/README.md` (698 lines). There is no single place that tells a user which toolkit item to run, in what order, for which task, or how to use the planner end to end.

## What Changes

- Add nested pages under `wiki/` for the planner (user guide, user flows, story skills, and architecture pages), for the toolkit (guide listing every skill, command, rule and agent, task recipes, install), and for the change workflow.
- Move the Architecture and story-skill detail out of `CLAUDE.md` into the architecture pages, written with repo-root paths, so the 30 checker failures end at the source. Keep in `CLAUDE.md` only the commands, the zone rule, the workflow, and a routing table with one row per wiki folder.
- Trim the root `README.md` and `toolkit/README.md` to a quick start, with links to the wiki pages for the full explanation. A README section is removed only after its content is on a wiki page.
- Update `Home.md` and `_Sidebar.md` to link every page, in reading order.
- Update links that point at README sections which move.
- **BREAKING** (docs only): `toolkit/README.md` no longer lists the communication rules, so the spec requirement that it does is replaced by one for the wiki.

## Capabilities

### New Capabilities

- `project-wiki`: what the repo's `wiki/` must contain (planner and toolkit user guides, architecture pages, workflow page), that it passes the docs checker, and that `CLAUDE.md` and the READMEs route to it rather than restating it.

### Modified Capabilities

- `toolkit-communication-rules`: the requirement "README lists the communication rules" moves to the toolkit wiki page, and the requirement that the toolkit's own markdown follows the documents rule stays and names the wiki pages too.

## Impact

- Files: `CLAUDE.md`, `README.md`, `toolkit/README.md`, `wiki/**`, and any file linking to a moved README section.
- No code, API or dependency changes. `scripts/check_docs.py` is used as it is.
- Known: the 30 failures all come from `CLAUDE.md`. Assumed: the flows in the READMEs and specs still match the code, which the tasks verify against `planner/portal/web/backlog-portal/components/` before writing. Unchecked: the first publish to the GitHub wiki.
