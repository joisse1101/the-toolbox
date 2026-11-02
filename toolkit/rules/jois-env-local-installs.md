---
metadata:
  version: "1.0.0"
  last_updated: "2026-10-31"
---
# Local installs only

Applies whenever you install a package, tool or module. It keeps installs inside the project folder
and never changes the user's machine.

## The test

- Before any install, check where it would land.
- Install only when it lands inside the project folder.
- Allowed examples: `npm ci`, `npm install`, `pip` run through the project's `.venv`.
- Refused examples: `pip install` against the system or user Python, `npm install -g`, a system package manager.

## Python

- Look for a `.venv` in the project, or in the folder that holds its `requirements.txt`.
- If one exists, install through its interpreter and do not create a second one.
- If none exists, create it with `python -m venv .venv`.
- Install the requirements file inside it, or the named package when there is no requirements file.
- Run `pip`, `pytest` and other Python tools through the `.venv`'s interpreter, never the system Python.

## Worktrees

- Each git worktree uses its own `.venv`.
- Create one in the worktree when it has none, even if the main checkout has one.
- Never reuse a `.venv` that lies outside the worktree.

## When there is no local way

- If an install would land outside the project, make it local first.
- If the tool has no project-local way to install, stop and ask the user before installing.

## One-off runs

- A run that installs nothing on the machine, such as `npx`, is allowed.
