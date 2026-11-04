# Proposal

## Why

A repo set up with `/jois-init:docs` can publish a wiki whose links open raw `.md` files, and nothing catches it (issue #82).
The shipped publish workflow runs the builder that rewrites `.md` links, but no check confirms a repo's workflow still does.
In `the-ledger` the workflow was recreated as a plain `rsync` of `wiki/`. It kept the `jois-init:docs` markers, so a re-run would replace it silently with no diff.

## What Changes

- `scripts/check_docs.py` gains a check on `.github/workflows/wiki-publish.yml`.
  - Known: it passes when the file is absent.
  - Known: when the file exists, a non-comment line must name `build_wiki.py` and `--out`, or the check fails with `file:line: message`.
  - The check does not hardcode the scripts folder.
- `docs.md`: a managed block that differs from the template is shown as a diff and needs a yes before it is replaced. Today a marked block is replaced without a question.
- `docs.md`: the report says `skipped (declined)` instead of the ambiguous `wiki-publish=skipped` when the user said no.
- Statements that the publish step strips `.md` are searched for in the templates and command text. A search of `toolkit/` found none that no check enforces, so this is a recorded check with no edit.
- Not in scope: a configurable scripts folder, and the `the-ledger` repair itself. That repo needs the builder, the template checker and the workflow added, in a session opened there.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-init-docs`: a new requirement that the checker fails when the publish workflow does not run the builder, and a changed re-run requirement that shows a diff before replacing a block that differs from the template.

## Impact

- `toolkit/skills/jois-init-docs-templates/scripts/check_docs.py` and its test file.
- `toolkit/commands/jois-init/docs.md`, including its `metadata.version` and `last_updated`.
- `openspec/specs/toolkit-init-docs/spec.md`, through the delta.
- Repos that already ran the command get the new check only when they re-run it. Unchecked: whether any repo besides `the-ledger` has a drifted workflow.
