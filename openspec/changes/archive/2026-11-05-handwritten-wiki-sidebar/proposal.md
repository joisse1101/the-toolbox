## Why

`/jois-init:docs` installs a builder that generates `wiki/_Sidebar.md` and a page list in `wiki/Home.md`, and a checker that fails when the generated text is stale. The Ledger repo replaced this with a hand-written sidebar that the checker keeps complete, because a generated list is alphabetical, mixes section prefixes and cannot express a reading order. A generator that could would need an ordering scheme (number prefixes, an order file or front matter), which is more machinery than a short link list needs. The templates must follow, so a new repo starts with the same standard.

## What Changes

- `scripts/build_wiki.py`: remove `page_title`, `nav_lines`, `_block`, `render_nav`, `write_nav`, the `MD_BEGIN` and `MD_END` constants and the `--write-nav` option. Keep `HOME`, `SIDEBAR` and `NAV_PAGES`. The docstring says the sidebar and Home are hand-written and checked by `check_docs.py`.
- `scripts/check_docs.py`: replace `check_navigation` with `check_sidebar` (every page except Home and the sidebar is linked exactly once in `_Sidebar.md`, and every sidebar link resolves). Narrow `check_orphans` to `Home.md` so a page missing from the sidebar is reported once. Add `check_claude_wiki_links` (a link in a `CLAUDE.md` that points under `wiki/` must name an existing file, resolved relative to that file). Wire both into `check_docs`.
- The two test files: delete the four `write_nav` tests, write the sample tree's Home and sidebar by hand, add tests for a page listed twice, a page missing from the sidebar, a broken sidebar link, a sidebar that links Home, and a broken `CLAUDE.md` wiki link in a nested file.
- New starter templates for `wiki/Home.md` and `wiki/_Sidebar.md`, with no markers. The command writes each only when it is missing and never touches it on a rerun. The starter wiki is flat.
- `commands/jois-init/docs.md`: step 4 writes the starter files instead of running `--write-nav`, and step 2 no longer says the builder makes the navigation. Version bump.
- `SKILL.md` and `toolkit/README.md`: describe a hand-written sidebar that the checker keeps complete.
- **BREAKING** for repos on the old layout: their marked scripts hold the old generator, so a rerun shows a diff and asks. Their generated `_Sidebar.md` and the generated block in `Home.md` stay as they are. The new checker rejects one line in that sidebar, the link to `Home`, which the repo deletes by hand once.

The scripts, tests, workflows, PR line, routing block and OpenSpec guidance keep their markers. Only the two starter wiki pages are marker-free, because the repo owns them from the first write.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-init-docs`: the "Nested docs layout" and "Recursive docs check" requirements change, "Generated navigation" is replaced by a hand-written sidebar requirement, and a requirement for the starter pages is added.

## Impact

- `toolkit/skills/jois-init-docs-templates/`: `scripts/build_wiki.py`, `scripts/check_docs.py`, both test files, `SKILL.md`, and two new starter files.
- `toolkit/commands/jois-init/docs.md` and `toolkit/README.md`.
- `openspec/specs/toolkit-init-docs/spec.md`, through the delta in this change.
- Repos that already ran the command see a diff on their next run.
- Not touched: `wiki-publish.yml` (it already runs `build_wiki.py --out`), `docs-check.yml`, and the three checker false positives for run-time paths, which are a separate checker feature.
- Unchecked: the new check code is written from the handover's description, because the Ledger commits were not readable from this session.
