# Design

## Context

See proposal.md for why. `scripts/check_docs.py` reads every inline-code path with two or more segments as a path from the repo root, skips fenced blocks, git-ignored paths and lines marked `docs-check: ignore`, and requires every page to be linked from `Home.md` and listed once in `_Sidebar.md`. `CLAUDE.md` may hold at most 200 lines. `planner/data/` is git-ignored, so naming it passes. Page names must be unique once flattened for the GitHub wiki.

## Goals / Non-Goals

**Goals:**
- A user can learn the planner and the toolkit from `wiki/` alone, and a contributor can find the architecture there.
- The checker passes, and `CLAUDE.md` stays short enough to read in one go.

**Non-Goals:**
- No code, script or workflow change, and no change to what any skill or command does.
- No rewrite of the specs. They stay the contract, and the wiki links to them.
- No publish to the GitHub wiki, which runs only on GitHub.

## Decisions

**Page layout.** Two topic folders and one page, so the routing table in `CLAUDE.md` has two rows plus the workflow page.

```
wiki/
  Home.md   _Sidebar.md   Workflow.md
  planner/
    Planner-Guide.md  User-Flows.md  Story-Skills.md
    architecture/
      Logic-Layer.md  Portal.md  Data-Folder.md  Story-Skills-Internals.md
  toolkit/
    Toolkit-Guide.md  Task-Recipes.md  Install.md  Rules.md
```

Page file names are unique across the wiki, because the builder flattens them and two equal names fail the checker. The toolkit guide is split into a catalogue (`Toolkit-Guide`), sequences (`Task-Recipes`), `Install` and `Rules`, because the 698-line README has four separate readers. More pages may be added when a section is too long, such as one per command group.

**Move, then trim, in that order.** Content lands on a wiki page and passes the checker before its source is deleted. Why: a README or `CLAUDE.md` trimmed first loses detail if the work stops half way. Alternative: rewrite each in place. Rejected, because it is the same work with more risk.

**Move reasons with the facts.** Each dense `CLAUDE.md` bullet is split into a short paragraph per topic. The rule in the documents rule applies: a "because" stays attached to what it explains. The check is a read of the old bullet against the new page, listed in the tasks.

**Bring facts from the source, not from memory.** Command behavior is read from each `toolkit/commands/**/*.md`, skill behavior from its `SKILL.md`, and portal behavior from the components and specs. Why: the READMEs may have drifted. Alternative: copy the README text. Rejected, because it would copy any drift.

**What stays in `CLAUDE.md`.** The commands block, the zone rule (which folder may import which, enforced by `planner/test/zones.test.mjs`), the OpenSpec and commit workflow, the ESM and CommonJS note, and the routing table. Everything else becomes a link.

**README link updates.** Before trimming, search for links to README anchors in `*.md`, `*.ps1`, `*.mjs`, `*.py` and the specs, then point each at the wiki page. The checker does not cover files outside `wiki/`, so this is a manual search.

## Risks / Trade-offs

- A reason is dropped in the move → read each old bullet against the new page, and list the check in tasks.
- A flow in the READMEs no longer matches the code → verify each against `planner/portal/web/backlog-portal/components/` and the specs before writing it.
- A link to a removed README section breaks outside `wiki/` → search for README anchors first, as above.
- The toolkit's own markdown must follow the documents rule, and the wiki toolkit pages count (see the spec delta) → write them with paragraphs for reasons and bullets only for parallel items.
- The first publish is unchecked until it runs on GitHub.

## Migration Plan

Work in the order of the tasks, one commit per concern. Rollback is a revert of the commits, because nothing outside docs changes.
