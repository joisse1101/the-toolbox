## Why

The `jois-init:docs` command puts the wiki source pages in `docs/wiki/`. The owner wants them in `wiki/` at the repo root, one folder shallower.

## What Changes

- **BREAKING**: the page folder moves from `docs/wiki/` to `wiki/` in the shipped scripts, workflow, templates and command text.
- The rule "SHALL NOT create a flat `wiki/` folder" is replaced. The nested pages now sit in `wiki/`, and the flat output is built only in a temporary folder.
- The tests build their fixtures under `wiki/`.
- Nothing else about the process changes: nested pages, drift checker, one-way publish, PR line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-init-docs`: the folder named in nine requirements changes, and the "Nested docs layout" requirement is reworded.

## Impact

- Code: `build_wiki.py` (`WIKI_DIR`), `check_docs.py` (messages), the `wiki-publish.yml` path filter, commit message and log line.
- Tests: `test_build_wiki.py` and `test_check_docs.py`.
- Text: `commands/jois-init/docs.md`, `toolkit/README.md`, `SKILL.md`, `claude-md-routing.md`, `pr-checklist-line.md`, `openspec-archive-guidance.yml`.
- Spec: `openspec/specs/toolkit-init-docs/spec.md`, including its Purpose line, which a delta cannot change.
- Projects that already ran `/jois-init:docs` must move `docs/wiki/` to `wiki/` by hand. Known: this repo has no `docs/wiki/`. Unchecked: other projects.
