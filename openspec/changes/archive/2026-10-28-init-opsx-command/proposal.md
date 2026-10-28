## Why

OpenSpec overwrites its generated `/opsx:*` commands on every `init` and `update`, so a stored copy
drifts from upstream and patching the generated files breaks whenever the wording moves. OpenSpec has
a per-project `openspec/config.yaml` for guidance on apply and archive, and no global equivalent, so
that is where our commit stops belong. A project needs a repeatable way to get them there.

## What Changes

- Remove `toolkit/commands/opsx/` (already gone on this branch) and the patch machinery in
  `toolkit/opsx/` (`Install-Opsx.ps1`, `patches.psd1`). Nothing in the toolkit edits a generated file.
- Add the command `/jois-init:opsx` (`toolkit/commands/jois-init/opsx.md`). Run inside a project, it
  sets up OpenSpec there: `openspec init` when missing, the global delivery and workflow settings, a
  managed guidance block merged into `openspec/config.yaml`, and `openspec update` to regenerate the
  `/opsx:*` commands. It is the only writer of that block.
- The guidance is short and points at the global `jois-git-commit-hygiene` rule instead of copying it.
  The command reports when that rule is not installed and does not install it.
- `Install-Toolkit.ps1` stays a plain copier into `~/.claude` or a project's `.claude`; it learns
  nothing about OpenSpec.
- The `/opsx:*` commands are no longer hidden from the session's skill list and archive's git commands
  prompt for permission. Both are accepted.

## Capabilities

### New Capabilities

None; the new command is a requirement of the existing `toolkit-skills` capability.

### Modified Capabilities

- `toolkit-skills`: adds the `/jois-init:opsx` command requirement; stops describing `opsx` as a
  stored command set (namespace-folder scenario, version exemption, hidden-flag wording).

## Impact

- `toolkit/commands/jois-init/opsx.md` (new), `toolkit/opsx/` (removed), `toolkit/README.md`,
  `toolkit/check_toolkit.py` and `toolkit/tests/test_check_toolkit.py` (no `opsx` special cases; the
  new command is checked like any other), `.gitignore` entries added for the generator.
- No change to the planner or to the installer's behavior.
