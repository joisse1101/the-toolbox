# Design

## Context

`toolkit/commands/jois-init/opsx.md` is one prompt file with seven steps. Only two writes belong to the toolkit: `openspec init` when `openspec/` is missing, and the guidance block in the project's `openspec/config.yaml`. The `delivery` and `workflows` settings are global OpenSpec config, and `openspec update` regenerates files from them. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- The command behaves the same whether the `/opsx:*` commands are project-level or global.
- Every write is its own plain-words question that says its scope (this project, or every project).

**Non-Goals:**
- Detecting where the commands are installed. With `delivery` and `update` gone, nothing depends on it.
- Changing the guidance text or the commit rule.

## Decisions

- **Drop `delivery` and `openspec update` instead of gating them on a project/global check.** A gate needs detection logic in a prompt file and still leaves a prompt that edits global config. Dropping them is simpler and cannot touch project files. Alternative: offer them only for project-level commands; rejected as more steps for little benefit.
- **Keep `workflows` as a read-only check.** The guidance applies to the `apply` and `archive` operations; if either is missing from `workflows`, the block is written but unused. The command reports this and offers the global fix as an optional, separate question. Alternative: stop checking it; rejected because it would hide a silent no-op.
- **Separate questions, one per write.** The bundled yes/no is what confused the user. Each question says why and the scope. Where the user declines the `workflows` fix, the command still writes the guidance.
- **One-line report at the end** replaces the free-form summary, so the user sees at once what was found and written. Fields: version, `openspec/` present, `workflows`, guidance (added, replaced or unchanged), commit rule.

## Risks / Trade-offs

- [A user on `delivery: skills` or on a custom profile may lack the `/opsx:*` commands] → the `workflows` check covers the profile case; `delivery` is no longer the toolkit's concern.
- [The commands may be stale after an OpenSpec upgrade] → out of scope; the user runs `openspec update` themselves, which the final report no longer implies.
- [The prompt is advisory, so behavior depends on the model following it] → the scenarios in the spec are the acceptance check, tried by hand in a project with global commands.
