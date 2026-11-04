---
name: "JOIS: Init Docs"
description: "Set up the docs process in this project: nested pages in wiki/, a drift checker, a builder, a one-way wiki publish and a PR checklist line"
allowed-tools: Bash(git status:*), Bash(git remote:*), Bash(git diff:*), Bash(python scripts/build_wiki.py:*), Bash(python scripts/check_docs.py:*), Bash(python -m pytest scripts/tests:*), Read, Glob, Edit, Write
disable-model-invocation: true
metadata:
  version: "1.2.0"
  last_updated: "2026-11-04"
---

Set the docs process up in the project this runs in.

The pages live in `wiki/` at the repo root as nested topic folders and are the source of truth.
The GitHub wiki is a one-way copy of them.

## Rules

- Every file this command writes comes from the template folder `jois-init-docs-templates`.
- Read the templates from `<project>/.claude/skills/jois-init-docs-templates/`, else from `~/.claude/skills/jois-init-docs-templates/`.
- If neither folder exists, say so, name `Install-Toolkit.ps1` and stop.
- Write nothing in that case, not even part of the setup.
- Ask about each write on its own yes/no question, in plain words.
- Say why the write is needed and what it changes.
- Never combine two writes in one question.
- Never write after a no. Carry on with the next write.
- The nested pages sit directly in `wiki/`.
- Never create a `docs/wiki/` folder.
- Build the flat output only in a temporary folder, never in the repo.
- Write only inside this project.
- A re-run never changes an existing starter page. `wiki/Home.md` and `wiki/_Sidebar.md` carry no markers, because the repo owns them from the first write.

## Markers

- A managed block sits between `jois-init:docs begin` and `jois-init:docs end` comment lines.
- The comment syntax is the file's own: `# ...` in Python and YAML, `<!-- ... -->` in markdown.
- A marker is a whole line that starts, after any indent, with the comment opener and the marker text.
- Text inside a line, such as a string in a script that names the marker, is not a marker.
- Every template already carries its markers, so copy it as it is.
- If the target already holds the markers, compare the lines between them with the template.
- If they are the same, report the block as unchanged.
- If they differ, show the diff and ask before replacing the block.
- A yes replaces the lines from the begin marker to the end marker in place.
- A no leaves the block as it is and the report shows the part as `skipped (declined)`.
- Keep every line outside the markers as it is.
- Never add a second copy of a block.
- A hand edit between the markers is never overwritten without a yes.

## Files without markers

- This covers an existing `CLAUDE.md`, workflow file, script, PR template or `openspec/config.yaml` that holds no `jois-init:docs` markers.
- If it is the same as the template, report it as unchanged.
- Otherwise show the diff and ask before changing it.
- A whole-file template (script, test, workflow): a yes replaces the file.
- A section template (`CLAUDE.md` routing, PR line, OpenSpec guidance): a yes adds the block and keeps the rest of the file.
- On a no, leave the file untouched and report `skipped`.

## Steps

1. **Check the project (read-only).**
   - Run `git status`. If this is not a git repository, say so and stop. Write nothing.
   - Run `git remote -v`. Note whether a GitHub remote exists.
   - Look for `wiki/`, a root `CLAUDE.md`, `openspec/config.yaml` and a PR template (`.github/pull_request_template.md`).
   - Look for the template folder, as in the Rules.
   - Report all findings in plain words before the first question about a write.
   - A missing GitHub remote does not stop the setup. Say the publish workflow will not work until one exists.
2. **Add the checker, builder and tests.**
   - Files: `scripts/check_docs.py`, `scripts/build_wiki.py`, `scripts/tests/test_check_docs.py`, `scripts/tests/test_build_wiki.py`, all from the template's `scripts/` folder.
   - Why: the checker fails the build when a page drifts from the repo, and the builder makes the flat wiki pages.
   - Ask one question for the scripts and one for the tests.
   - The scripts need only Python.
3. **Add the `docs-check` workflow and the PR line.**
   - Ask separately about `.github/workflows/docs-check.yml` (from `workflows/docs-check.yml`) and about the PR checklist line.
   - The workflow runs the checker on every pull request.
   - The PR line comes from `pr-checklist-line.md`. It goes into `.github/pull_request_template.md`.
   - Create the template with the block when none exists.
   - Otherwise add the block and leave the other text as it is.
4. **Add the `wiki/` skeleton.**
   - Why: the checker and the publish step need a `Home.md` and a `_Sidebar.md`, and the repo then edits both by hand.
   - Ask first. Then copy the template's `wiki/Home.md` and `wiki/_Sidebar.md` into `wiki/`, each only when it is missing.
   - Never change an existing `Home.md` or `_Sidebar.md`, and do not ask about one. Say that the repo edits them by hand.
   - Skip this step if step 2 was refused, because the checker is not there. Say so.
   - Then run `python scripts/check_docs.py` and report what it prints.
   - If it fails on pages the project already had, show the failures and change nothing.
5. **Add the publish workflow.**
   - This comes after the checks, so a repo never publishes pages that nothing guards.
   - Ask first. Then write `.github/workflows/wiki-publish.yml` from `workflows/wiki-publish.yml`.
   - If the file already holds the markers, follow Markers instead: show the diff and ask before replacing.
   - After it is added or replaced, state the setup notes below.
   - After a no, or when the block is unchanged, do not state them.
6. **Offer `CLAUDE.md` routing.**
   - Ask separately. The block comes from `claude-md-routing.md`.
   - If a root `CLAUDE.md` exists, add the block between markers and do not rewrite the rest.
   - If none exists, create it with the block only.
7. **Offer OpenSpec guidance.**
   - This applies only when `openspec/config.yaml` exists. Otherwise report it as `skipped` with "no OpenSpec".
   - Ask first. The block comes from `openspec-archive-guidance.yml`.
   - Put it in the `guidance:` list of `operations.archive`.
   - Create the keys when they are missing.
   - Indent the lines to match the file.
   - Never touch the `jois-init:opsx` blocks.
   - Show the diff (`git diff openspec/config.yaml`) and ask before keeping it.
8. **Read back.**
   - Read each file written from disk and check its marker lines appear exactly once each, as the Markers section defines them.
   - List a part as added only after this read-back matched.
9. **Report in one line**, in the form below.
   - Then state the setup notes if the publish workflow was added or replaced.
   - Then, if the user declined a replacement and `python scripts/check_docs.py` still fails, name the file and say the check keeps failing until the block is replaced or fixed by hand.
   - Then say the first real publish is unchecked: it runs only on GitHub.

   ```
   checker: added | builder: added | workflows: added | PR line: added | CLAUDE.md routing: skipped | OpenSpec guidance: skipped
   ```

   Each field takes one value: `added`, `replaced`, `unchanged`, `skipped` or `skipped (declined)`.
   - `checker`: `scripts/check_docs.py` and its test.
   - `builder`: `scripts/build_wiki.py`, its test and the skeleton.
   - `workflows`: `docs-check.yml` and `wiki-publish.yml`. If the two differ, write `docs-check=added, wiki-publish=skipped (declined)` when a replacement was declined.
   - `PR line`, `CLAUDE.md routing` and `OpenSpec guidance`: the block in its file.

## Setup notes

State these four facts once the publish workflow is added or replaced, before the report:

- The repo's wiki must be enabled (Settings, Features, Wikis).
- One first wiki page must be created once in the web interface. Git cannot clone an empty wiki.
- Actions workflow permission must be set to read and write (Settings, Actions, General, Workflow permissions).
- Publishing deletes every wiki page that is not in `wiki/`. Wiki edits are warned about and then overwritten.

None of these can be set by this command.
