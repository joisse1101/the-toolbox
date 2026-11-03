## 1. Scripts and tests

- [x] 1.1 Change `WIKI_DIR` in `toolkit/skills/jois-init-docs-templates/scripts/build_wiki.py` to `Path("wiki")` and update its docstring and help text; verify by `python -m pytest` in `toolkit` after task 1.3. (result: `./.venv/Scripts/python.exe -m pytest` in toolkit -> 87 passed, 0 failed)
- [x] 1.2 Update the docstring and help text in `check_docs.py`; verify `grep -r "docs/wiki" toolkit/skills` finds nothing in the scripts. (result: Grep `docs/wiki` in `*.py` under `toolkit/skills` -> no matches; the non-script files under `toolkit/skills` still contain it and belong to later tasks)
- [x] 1.3 Change the fixtures and expected messages in `test_build_wiki.py` and `test_check_docs.py` from `docs/wiki` to `wiki`; verify `cd toolkit; python -m pytest` passes. (result: `cd toolkit; ./.venv/Scripts/python.exe -m pytest` -> 87 passed, 0 failed)

## 2. Workflow and templates

- [x] 2.1 In `workflows/wiki-publish.yml`, change the path filter, the comments, the "already matches" line and the commit message to `wiki/`; verify the file holds no `docs/wiki`. (result: Grep `docs/wiki` in toolkit/skills/jois-init-docs-templates -> 0 matches after edit; wiki-publish.yml path filter, comments, "already matches" line and commit message now `wiki/`)
- [x] 2.2 Update `claude-md-routing.md`, `pr-checklist-line.md`, `openspec-archive-guidance.yml` and `SKILL.md` to `wiki/`; verify no `docs/wiki` remains in the template folder. (result: Grep `docs/wiki` in toolkit/skills/jois-init-docs-templates -> 0 matches, 0 files; claude-md-routing.md, pr-checklist-line.md, openspec-archive-guidance.yml and SKILL.md now `wiki/`)

## 3. Command and README

- [x] 3.1 Update `toolkit/commands/jois-init/docs.md` (description, layout, checks, skeleton, notes) to `wiki/`; verify `python check_toolkit.py` passes. (result: `python check_toolkit.py` -> `toolkit check passed`; Grep `docs/wiki` in `docs.md` -> only the "Never create a `docs/wiki/` folder" rule line)
- [x] 3.2 Update the docs section of `toolkit/README.md` and add one line telling a project on the old layout to run `git mv docs/wiki wiki` and re-run the command; verify no `docs/wiki` remains other than that line. (result: Grep `docs/wiki` in `toolkit/README.md` -> only line 469, the `git mv docs/wiki wiki` migration line)

## 4. Spec and final check

- [x] 4.1 Change the Purpose line in `openspec/specs/toolkit-init-docs/spec.md` to name `wiki/`, since the delta cannot; verify by reading it. (result: read line 5 of openspec/specs/toolkit-init-docs/spec.md -> names `wiki/`)
- [x] 4.2 Run `grep -r "docs/wiki" toolkit openspec/specs` and `cd toolkit; python check_toolkit.py; python -m pytest`; verify the only hits are the migration line and the "Never create a `docs/wiki/` folder" rule line in `docs.md` (and the spec's own "SHALL NOT create a `docs/wiki/` folder" text) and both commands pass. (result: Grep "docs/wiki" toolkit -> 2 hits, README migration line and the docs.md "Never create" rule; Grep openspec/specs -> only the main spec's old requirements until archive; check_toolkit.py -> "toolkit check passed"; pytest toolkit -> 87 passed)
