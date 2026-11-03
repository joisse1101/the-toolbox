# Proposal

## Why

Developers need a knowledge base that lives with the code, is reviewed with it and is also readable in the GitHub wiki. Another project (the-ledger) already runs this process, but each new repo has to copy its files and edit them by hand. Issue 39 asks for a command that sets the process up in any repo, the way `/jois-init:opsx` sets up OpenSpec. The slice archive (issue 73) will later write pages into the same place, so the layout has to be fixed first.

## What Changes

- Add the command `/jois-init:docs` (`toolkit/commands/jois-init/docs.md`). It works in the project it runs in, asks about each write on its own, and ends with a one-line report in the style of `opsx`.
- Make the docs layout **nested**: pages live in topic folders under `docs/wiki/` (for example `architecture/`). The handoff attached to issue 39 describes a flat `wiki/` folder, so its scripts need the changes below.
- Ship these files with the toolkit, for the command to copy into a project:
  - a docs builder that regenerates `_Sidebar.md` and the page list in `Home.md` from the folder tree, and flattens the tree for the wiki, rewriting links;
  - a docs checker (from the handoff's `check_docs.py`) that scans `docs/wiki/` recursively and also fails when the generated navigation is out of date;
  - tests for both scripts;
  - the `docs-check` and `wiki-publish` workflows, and a PR checklist line.
- Make the publish workflow warn about wiki edits made outside the repo and then overwrite them. There is no sync back from the wiki.
- Keep every block the command manages between `jois-init:docs` marker comments, so a rerun replaces it in place and never adds a second copy.
- Offer routing-table sections for `CLAUDE.md` files and, when the project uses OpenSpec, archive guidance, each only after a yes and without rewriting existing content.
- Update `toolkit/README.md` to describe the command and the one-time wiki setup.

Not in this change:
- Generating pages from slices (issue 73).
- Staleness checks that depend on code changes (symbol check, verified-at-commit warning, stale marker), which belong to issue 73.
- Any sync from the wiki back to the repo.

## Capabilities

### New Capabilities
- `toolkit-init-docs`: the docs setup command, the nested `docs/wiki/` layout, the builder and checker scripts it installs, and the publish and check workflows.

### Modified Capabilities
<!-- None. The existing `toolkit-skills` requirements already cover versioned jois-init commands and the installer copying command and skill folders; they need no change. -->

## Impact

- New files under `toolkit/`: the command, one skill folder holding the templates (see design.md), and README text.
- `toolkit/check_toolkit.py` and its tests may need to cover the new skill folder; they already check every `jois-init` command.
- New spec `openspec/specs/toolkit-init-docs/` once archived.
- No change to `planner/`. Nothing here writes to a project until a user runs the command and confirms each write.
- Checked: `Install-Toolkit.ps1` copies a skill folder with `Copy-Item -Recurse`, so non-markdown template files arrive intact.
