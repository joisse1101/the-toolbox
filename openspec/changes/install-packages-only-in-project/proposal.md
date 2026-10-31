# Proposal

## Why

In a recent session Claude needed pytest, found no `.venv` in the worktree and ran `pip install pytest`. That put the package into the user's global Python, and the user had to ask for its removal. No toolkit rule says where packages may be installed. The only mention of `.venv` is in `toolkit/README.md`, which Claude does not load. The problem is not specific to Python: a global `npm install -g` or a system package manager call does the same harm. See GitHub issue 58.

## What Changes

- Add `toolkit/rules/jois-env-local-installs.md`, a rule with one test for every install: the package must land inside the project folder.
  - Project-local installs are fine: `npm ci`, `npm install`, `pip` run through a `.venv`, and the equivalents for other tools.
  - If the install would land outside the project (global, user-level or system), Claude first makes it local. For Python it looks for a `.venv` (in the project, or beside the project's `requirements.txt`), creates one with `python -m venv .venv` when missing, and installs the requirements file, or the named package when there is none, inside it.
  - Python tools (`pip`, `pytest` and the like) run through the `.venv`'s own interpreter, never the system Python.
  - When a tool has no project-local way to install, Claude stops and asks the user before installing.
  - Each worktree gets its own `.venv`; it does not reuse the main checkout's, which lies outside the worktree.
  - One-off runs that only use a download cache and install nothing on the machine (such as `npx`) are allowed.
- The rule has no `paths:` frontmatter. This departs from the issue's wording about `.py` files: installing runs in the shell and touches no code file, and a scoped rule is not loaded until a matching file is read (the reason `jois-git-commit-hygiene` and `jois-test-mock-data` are unscoped).
- `check_toolkit.py` lists the rule in `UNSCOPED_RULES`, with tests that it is accepted without `paths:` and rejected with them.
- `toolkit/README.md` lists the rule and updates its unscoped-rule wording.
- `jois-code-python.md` is not changed beyond, at most, a one-line pointer to the new rule, so no guidance is duplicated.
- The installer needs no change: it copies everything in `toolkit/rules/`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-coding-standards`: a new requirement for the `jois-env-local-installs` rule, loaded in every session, with its content and the docs-check behavior for an unscoped rule.

## Impact

- `toolkit/rules/jois-env-local-installs.md` (new), `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`, `toolkit/README.md`.
- Costs a short block of context in every session that installs the toolkit rules.
- Closes GitHub issue 58.
