# Tasks

## 1. Command file

- [x] 1.1 In `toolkit/commands/jois-init/opsx.md`, remove the global `delivery` step and the `openspec update` step, and reword the `description` frontmatter and intro to match; verify with `grep -n "delivery\|openspec update" toolkit/commands/jois-init/opsx.md` that neither is left as a step.
- [x] 1.2 Replace step 3 with a read-only `workflows` check: run `openspec config get workflows`, report it, and only if `apply` or `archive` is missing say in plain words the guidance will not take effect for it and ask, as its own question naming that it changes a global setting for every project, whether to fix it; verify by reading the step against the "Workflows" scenarios in the delta spec.
- [x] 1.3 Rewrite the intro and steps so each write (init, guidance, optional workflows fix) is its own question stating why and its scope, with no bundled yes/no; verify no step asks about more than one write.
- [x] 1.4 Replace the final report step with a single report line (version, `openspec/` present, `workflows`, guidance added/replaced/unchanged, commit rule found) and keep the advisory-guidance note; verify the example line in the file matches the spec's "One-line report" scenario.
- [x] 1.5 Bump `metadata.version` (1.0.0 to 1.1.0) and `metadata.last_updated`; verify `cd toolkit; python check_toolkit.py` passes.

## 2. Docs

- [x] 2.1 Update the "OpenSpec setup" section in `toolkit/README.md` to drop `delivery` and `openspec update`, describe the read-only `workflows` check and the one-line report; verify no remaining mention with `grep -n "delivery\|openspec update" toolkit/README.md`.

## 3. Check

- [x] 3.1 Run `cd toolkit; python check_toolkit.py; python -m pytest` and `openspec validate fix-init-opsx-global-assumptions` and verify all pass.
- [x] 3.2 In a project that has `openspec/` and global-only `/opsx:*` commands, run `/jois-init:opsx` and verify it asks one question per write, never touches `delivery` or runs `openspec update`, and ends with the one-line report.

## Workflow follow-up

- Archive the change after the manual run in 3.2 passes.
