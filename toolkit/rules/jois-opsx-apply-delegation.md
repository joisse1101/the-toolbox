---
metadata:
  version: "1.0.0"
  last_updated: "2026-10-30"
---
# OpenSpec apply delegation

Applies to every `/opsx:apply` run. It takes precedence over the generated command's step of
making each task's code changes in this session: hand each task to `opsx-task-applier` instead.

- Dispatch one task at a time and wait for its report before the next dispatch.
- Before each dispatch say: the task, the files you expect it to touch, a rough time estimate
  labeled as an estimate, that there is no live timer, how to open the transcript (the agent's row
  in the agent panel, then Enter, or `/tasks`), and the turn limit (`maxTurns` in the agent file).
- After each report say in one line whether the task is done, failed or blocked. For a done task,
  copy the report's `result:` clause verbatim into the task's line in `tasks.md` and tick the box.
- On `blocked`, ask the user, then dispatch the task again with the answer.
