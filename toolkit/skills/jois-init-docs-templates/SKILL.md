---
name: jois-init-docs-templates
description: Template files for the `/jois-init:docs` command (docs checker, wiki builder, workflows and their tests). Not for direct use; run `/jois-init:docs` instead.
metadata:
  version: "1.0.0"
  last_updated: "2026-11-03"
---
# Templates for /jois-init:docs

Purpose: this folder holds the files that `/jois-init:docs` copies into a project. It is not a skill to invoke.

## Contents

- `scripts/build_wiki.py`: lists the pages under `wiki/`, flattens them for the GitHub wiki and regenerates the navigation.
- `scripts/tests/test_build_wiki.py`: tests for the builder.
- `scripts/check_docs.py`: the drift checker (links, orphans, inline-code paths, `CLAUDE.md` sizes, navigation, unpublished files).
- `scripts/tests/test_check_docs.py`: tests for the checker.
- `workflows/docs-check.yml`: runs the checker on every pull request.
- `workflows/wiki-publish.yml`: builds the flat pages and mirrors them one way into the GitHub wiki.
- `pr-checklist-line.md`: the one pull request checklist line.
- `claude-md-routing.md`: the routing-table section for the root `CLAUDE.md`.
- `openspec-archive-guidance.yml`: the archive guidance entry for `openspec/config.yaml` (`operations.archive.guidance`).

## Rules

- Install this folder with the toolkit installer; the command reads it from `.claude/skills/` in the project or in `~/.claude/skills/`.
- Edit the files here, never the copies in a project: a re-run of the command replaces them.
