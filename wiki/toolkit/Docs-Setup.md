# Docs Setup

This page explains what `/jois-init:docs` writes into a project, how the nested wiki layout works and what the command cannot do for you. The command sets up a docs process in the project it runs in. The pages live in the repo, are checked for drift on every pull request and are copied one way to the GitHub wiki. The short recipe is on [Task Recipes](Task-Recipes.md), and the item list is in the [Toolkit Guide](Toolkit-Guide.md).

The command needs the `jois-init-docs-templates` skill folder, which holds every file it writes. Install it with `.\Install-Toolkit.ps1 -Skill jois-init-docs-templates`, in the project or in `~/.claude`. If neither has it, the command says so, names `Install-Toolkit.ps1` and writes nothing.

The command first checks the project (a git repo, a GitHub remote, `wiki/`, a root `CLAUDE.md`, `openspec/config.yaml`) and reports what it found. It then asks about each write on its own yes or no question, and a no skips only that write.

## What it writes

- `scripts/check_docs.py` and `scripts/build_wiki.py`: the checker and the builder, plain Python with no install step.
- `scripts/tests/test_check_docs.py` and `scripts/tests/test_build_wiki.py`: their tests.
- `.github/workflows/docs-check.yml`: runs the checker on every pull request.
- `.github/workflows/wiki-publish.yml`: publishes the pages to the wiki.
- One checklist line in `.github/pull_request_template.md`, created when the template is missing. <!-- docs-check: ignore -->
- A starter `wiki/Home.md` and `wiki/_Sidebar.md`, each written only when missing and edited by hand from then on.
- An optional routing-table section in `CLAUDE.md` files.
- When `openspec/config.yaml` exists, optional archive guidance that tells the archiver to update the affected page first. The `jois-init:opsx` blocks are not touched.

It ends with a one-line report, each part marked `added`, `replaced`, `unchanged` or `skipped`.

## The nested layout

Pages sit in topic folders under `wiki/` at the repo root, for example `wiki/architecture/billing/refunds.md`. <!-- docs-check: ignore --> A project on the old layout runs `git mv docs/wiki wiki` and re-runs the command. The nested pages sit directly in `wiki/`, and the flat output is built only in a temporary folder.

`Home.md` and `_Sidebar.md` are both hand-written and carry no markers, so a re-run never changes them. The sidebar lists pages in the order you write them, so it can follow a reading order, and nothing generates it. The checker keeps the sidebar complete. It fails on a page not linked once from `_Sidebar.md`, a page linked twice, a sidebar link that does not resolve and a sidebar link to `Home.md`. It also fails on a broken relative link, a page not linked from `Home.md`, a `CLAUDE.md` link into `wiki/` that names no file, a missing path in inline code and an oversized `CLAUDE.md`. A non-markdown file under `wiki/` also fails, because the wiki would not publish it.

The GitHub wiki is flat, so the builder joins folders with `-`: the page `wiki/architecture/billing/refunds.md` becomes `architecture-billing-refunds`. <!-- docs-check: ignore --> The builder rewrites links to match and keeps anchors. Two pages with the same flat name make it fail, and renaming or moving a page changes its wiki URL.

## One-time wiki setup

The command cannot do these three things, and it states them after it adds the publish workflow:

- Enable the wiki in the repo (Settings, Features, Wikis).
- Create one first wiki page in the web interface, because git cannot clone an empty wiki.
- Set Actions workflow permission to read and write (Settings, Actions, General, Workflow permissions).

## The overwrite rule

Publishing is one way, from `wiki/` to the wiki, and nothing syncs back. Each publish deletes every wiki page that is not in `wiki/`. Before it overwrites, the workflow warns about wiki commits not made by the Actions bot, and then publishes anyway. Edit pages in the repo, never in the wiki.

## Re-running

Every managed block sits between `jois-init:docs begin` and `jois-init:docs end` markers. A re-run replaces the block in place and never adds a second copy, and text outside the markers is kept. A hand edit between the markers is overwritten. A file that has no markers and differs from the template is shown as a diff and needs a yes before it changes. The two starter wiki pages are the exception: they are never changed once they exist.

## What is unchecked

The first real publish to a GitHub wiki is unchecked. The workflow runs only on GitHub, and this repo's tests cover the builder offline.
