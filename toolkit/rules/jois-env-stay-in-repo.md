---
metadata:
  version: "1.0.0"
  last_updated: "2026-11-03"
---
# Stay in the repo

Applies to every file you create for your own work and to every read or write you make. It keeps
all of it inside the project folder.

## Where your files go

- Put every file you create for your work under `.scratch/` at the project root.
- This covers mock repos, mock data, scratch files and agent progress notes.
- Never create them in the system temp folder, the user's home folder or any folder outside the project.
- This rule outranks a scratchpad folder the harness suggests. Use `.scratch/` instead.
- Check that `.scratch/` is git-ignored. Add it to `.gitignore` when it is missing.
- When the work is done, remove what you created there.

## Reads and writes

- Never read or write outside the project.
- Never read subagent transcripts.
- Point a tool whose default temp folder lies outside the project at `.scratch/`, where the tool allows it.
- Examples: `pytest --basetemp .scratch/pytest`, a `TMPDIR` variable.

## Worktrees

- Each git worktree has its own `.scratch/`.

## Subagents

- When you dispatch a subagent that can write files, tell it to append one short line to `.scratch/agents/<agent>.log` after each step.
- Example line: `task 3 of 7 done, running tests`.
- Follow the agent through that file or its final report only.
- A subagent that cannot write files is waited for. Read its final report.
