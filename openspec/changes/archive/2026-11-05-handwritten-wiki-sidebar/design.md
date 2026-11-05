# Design

## Context

The builder and checker templates mirror the pre-change scripts of the Ledger repo. `build_wiki.py` owns two jobs today, flattening pages for the GitHub wiki and generating navigation. `check_docs.py` imports `build_wiki` for `LINK_RE`, `resolve_link`, `list_pages`, `NAV_PAGES` and `render_nav`. The command (`docs.md`) treats a file with `jois-init:docs` markers as managed and a markerless file as one unit: identical is `unchanged`, anything else gets a diff and a whole-file yes or no. See proposal.md for the motivation.

The Ledger commits (`5558185` and the four after it) were not readable from this session. The check code below is written from the handover's description, and the implementer should diff `5558185~1` against `5558185` in that repo and prefer it where the two differ.

## Goals / Non-Goals

**Goals:**
- The builder only lists, validates and flattens. It never writes `Home.md` or `_Sidebar.md`.
- The checker keeps a hand-written sidebar complete and keeps `CLAUDE.md` wiki links true.
- A repo that runs the command in a fresh folder gets a wiki that passes the checker with no edits.

**Non-Goals:**
- Teaching the checker about paths created at run time (the three Ledger false positives).
- Changing the publish workflow, which already runs `build_wiki.py --out`.
- An ordering scheme for the sidebar.

## Decisions

### The builder keeps `HOME`, `SIDEBAR` and `NAV_PAGES`

The checker imports these names, and the builder's own page listing needs to know the two special pages. Removing the generator therefore removes functions and the `--write-nav` option, and leaves the constants. The `import posixpath` stays, because `resolve_link` uses it.

### Sidebar check replaces the navigation check

`check_sidebar` reads `_Sidebar.md` once and reports, with `wiki/_Sidebar.md:<line>`:
- a link that does not resolve to a page,
- a link to `Home.md`,
- a page linked more than once, naming the page,
- and, with no line of its own, a page not linked at all, named by the page's path.

Each page is therefore reported by one check. `check_links` already reports a broken link inside any page including the sidebar, so `check_sidebar` skips the resolve test for links `check_links` has reported, to avoid a double report. The handover notes that the missing-page and broken-link tests pass against the old code because those messages already existed, and that only the listed-twice and `CLAUDE.md` tests prove the new behavior. The messages are kept unchanged for that reason.

`check_orphans` loses its loop over `NAV_PAGES` and checks `Home.md` only, so a page missing from the sidebar is not also reported as an orphan of the sidebar. Alternative considered: drop `check_orphans` and require pages only in the sidebar. Rejected because Home is the first page a reader sees, and a page it never mentions is worth a failure.

### The `CLAUDE.md` link check resolves from the file's own folder

`check_claude_wiki_links` finds every `[text](target)` outside fenced code in each file from `claude_files`, resolves the target with `posixpath.normpath(posixpath.join(posixpath.dirname(rel), target))` relative to the repo root, and fails when the result starts with `wiki/` and names no existing file. A link that does not point under `wiki/` is not this check's business and is ignored. Anchors are stripped before the test. The `import posixpath` is added to `check_docs.py`.

### Starter files are separate template files, not code

The old command ran the builder to make `Home.md` and `_Sidebar.md`. With no generator, the skill folder gets two new files, `wiki/Home.md` and `wiki/_Sidebar.md`, which the command copies when the target is missing. A starter that lives as plain markdown is edited without touching Python, and the checker test that proves the starter passes reads those same files.

The starter wiki is flat: `Home.md`, `_Sidebar.md` and no page folders. Alternative considered: a starter with example folders. Rejected because the starter would then ship placeholder pages that every repo must delete, and a folder tree is easy to add later. The builder and checker support nested pages either way.

The starter `_Sidebar.md` holds a heading and a comment line saying that pages are listed here by hand in reading order. The starter `Home.md` holds a short welcome and the same note. Neither carries markers, so the command's marker comparison never applies to them, and the "write only when missing" rule is the whole protection.

### Markers stay on scripts, tests, workflows and blocks

Only the two starter pages lose markers. Dropping markers from the scripts would mean a rerun can only offer a whole-file replacement, and toolkit fixes would reach repos less often. The Ledger repo removed them from its scripts, which is that repo's choice and does not need to be the template's. An old installed script holds the old generator between its markers, so a rerun compares it with the new template, shows the diff and asks, which is the existing behavior.

### Docs follow the code

`docs.md` step 2 says the builder "makes the flat wiki pages" only. Step 4 becomes: ask first, then copy the starter `Home.md` and `_Sidebar.md` when missing, then run `python scripts/check_docs.py` and report it. The step still skips when step 2 was refused, because the checker is not there. `docs.md` and `SKILL.md` versions go up one minor step, and the `last_updated` dates change. `toolkit/README.md` drops the generated sidebar and the `--write-nav` instruction, and says that `Home.md` and `_Sidebar.md` are edited by hand and the checker keeps the sidebar complete.

## Risks / Trade-offs

- [Old installs fail the new checker on the sidebar's `Home` link] → The migration note in the spec names the one line to delete, and the command's diff makes the new behavior visible before the replacement.
- [Check code differs from Ledger's, since it is written from a description] → The task list tells the implementer to diff the Ledger commit first, and the tests are the ones the handover names.
- [A hand-written sidebar can drift in reading order] → Accepted. The checker keeps it complete, and order is the point of writing it by hand.
- [Toolkit fixes to `Home.md` or the sidebar never reach a repo] → Accepted, because the repo owns those pages.

## Migration Plan

A repo on an earlier version re-runs `/jois-init:docs`, accepts the replacement of the four script blocks, and deletes the `Home` line from its generated `_Sidebar.md`. Its `Home.md` block keeps working as hand-written text. Rollback is a git revert of the script replacement, because the command writes only inside the project.

## Open Questions

- Whether the wiki-publish template's flattening should stay unchanged when a repo mixes a flat and a nested layout. It does today, because the builder supports both.
