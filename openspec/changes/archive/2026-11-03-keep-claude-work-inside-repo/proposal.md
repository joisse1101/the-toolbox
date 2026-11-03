# Proposal

## Why

Claude keeps working outside the repo, and the rules do not stop it.

- It builds mock repos and mock data in the system temp folder or the harness scratchpad, because `jois-test-mock-data` never says where they go.
- It stops and asks whether it may create a `.venv`. In one case it refused to commit because "no `.venv` is installed".
- It cannot follow a subagent, because the agent's transcript is in `~/.claude/projects`, outside the repo, where reads are blocked.

The transcripts must stay outside for security. The fix is a progress file inside the repo.

## What Changes

- New unscoped rule `jois-env-stay-in-repo`:
  - Everything Claude creates for its own work lives in one git-ignored folder, `.scratch/`, at the project root.
  - Claude removes what it created when done, and never reads or writes outside the project.
  - It overrides a harness suggestion of a temp-folder scratchpad.
  - A dispatched subagent that can write files appends a short line to `.scratch/agents/<agent>.log` after each step. Claude reads that file, never the transcript.
- `jois-test-mock-data`: mock repos and mock data go to `.scratch/`; verification runs through the project's own `.venv` or `node_modules`.
- `jois-env-local-installs`: a missing `.venv` is never a reason to stop or ask. Asking is only for a tool with no project-local way to install.
- `jois-git-commit-hygiene`: a missing environment is not a failing check. Claude sets it up and runs the checks.
- The docs check lists the new rule as unscoped, the README documents it, and `.gitignore` gets `.scratch/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-coding-standards`: adds a requirement for the stay-in-repo rule and amends the requirements for the mock-data, local-installs and commit-hygiene rules.

## Impact

- `toolkit/rules/`: one new file, three edited.
- `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`, `toolkit/README.md`, `.gitignore`.
- The installer is unchanged, because it copies everything in `toolkit/rules/`.
- Not solved here:
  - Claude Code's own permission prompts (a settings change).
  - Tools whose default temp folder is outside the repo (`os.tmpdir`, pytest `tmp_path`). The rule can only tell Claude to point them at `.scratch/`.
  - Read-only agents (`code-reviewer`, `arch-checker`, `sec-checker`) cannot write notes. Their final report is all the main session gets.
