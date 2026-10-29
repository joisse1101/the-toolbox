## Why

`/opsx:apply` runs every task of a change in the main conversation, so one window fills with the
working detail of every task. The author gets a long, crowded session, and `write-pr` then has to
find its Author Verification facts in that session. Subagents keep the working detail out of the
main window, but only if their reports carry the verification facts and the author can still see
what is running.

## What Changes

- Add a Claude agent, `toolkit/agents/opsx-task-applier.md`, that applies one task of an OpenSpec
  change. It has a narrow tool list, a turn limit, and a frontmatter hook that blocks `git commit`,
  `git push` and `gh`. It never edits `tasks.md` and never commits.
- Fix the shape of its report: changed files, commands run with the observed result and any counts,
  manual checks, unverified items, and one ready-made `result:` clause. Reports state only what the
  agent saw. An agent that meets a decision it cannot make ends with `blocked: <question>` and does
  not guess.
- Add one line to the `/jois-init:opsx` guidance block for `operations.apply`. It asks the main
  session to hand each task to the agent one at a time, to announce each dispatch (task, files,
  a rough time estimate labeled as an estimate, and how to open the agent's transcript), and to copy
  each report's `result:` clause verbatim into the task's line in `tasks.md`. `write-pr` already
  reads those clauses, so its template and rules do not change.
- Add `agents` as a fourth installable kind: `agents` entry in `toolkit/install/targets.json`
  (`~/.claude/agents`, `.claude/agents`), an `-Agent` parameter and agent items in
  `Install-Toolkit.ps1`, and agent checks in `check_toolkit.py` with tests.
- The delegation is advisory guidance, not enforcement. The generated `/opsx:*` commands are not
  edited, copied or regenerated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: agents become an installable kind next to skills, commands and rules; the
  installer, its listing, its uninstall and its write scope cover them; the task agent, its report
  contract, its limits and the apply guidance line that delegates to it are added; the docs check
  covers agent files.

## Impact

- New: `toolkit/agents/opsx-task-applier.md`.
- Changed: `toolkit/install/targets.json`, `toolkit/install/Install-Toolkit.ps1`,
  `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`,
  `toolkit/commands/jois-init/opsx.md` (guidance block, version bump), `toolkit/README.md`, this
  repository's `openspec/config.yaml` (the managed block, by running `/jois-init:opsx`).
- No change to `write-pr`, `update-pr`, the commit-hygiene rule or the planner.
- Checks: the toolkit's own tests (`cd toolkit; python check_toolkit.py; python -m pytest`).
