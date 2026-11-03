## Context

- Known: the folder is one constant, `WIKI_DIR = Path("docs") / "wiki"` in `build_wiki.py`, and `check_docs.py` reads it from there.
- Known: the publish workflow builds into `$RUNNER_TEMP/wiki-out` and clones the wiki into `$RUNNER_TEMP/wiki`, never into the repo.
- Known: the `*/CLAUDE.md` check looks one folder down and is unaffected.
- See proposal.md for the reason.

## Goals / Non-Goals

**Goals:**
- Every place that names the page folder names `wiki/`.
- One constant stays the single source in the code.

**Non-Goals:**
- No option to choose another folder.
- No migration tool for projects that already installed the old layout.

## Decisions

### Change the constant, not add a setting
- Change `WIKI_DIR` to `Path("wiki")`.
- Alternative: a configurable folder. Rejected, because nobody asked for it and it adds a setting to test.

### Reword the "no flat `wiki/` folder" rule
- New rule: the nested pages sit directly in `wiki/`, and the flat output is built only in a temporary folder.
- Reason: the old rule kept the nested source apart from a flat copy. That is still true, only the name changed.

### Publish path filter becomes `wiki/**`
- The filter must match the new folder, or a push would not publish.
- It matches nothing else in the repo, since the wiki clone lives in the runner's temporary folder.

### No migration help
- A project on the old layout moves the folder with `git mv docs/wiki wiki` and re-runs the command.
- A re-run replaces managed blocks in place, so the new text lands without duplicates.

## Risks / Trade-offs

- [A project on the old layout re-runs the command and gets two folders] → The README names the `git mv` step.
- [A `wiki/` folder already used for something else] → The command's first check reports an existing `wiki/` before it writes.
