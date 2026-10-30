---
name: "JOIS: Apply"
description: "Apply an OpenSpec change one group of tasks at a time: hand each group to opsx-task-applier, record its results in tasks.md, stop for a commit after each group"
allowed-tools: Bash(openspec:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Read, Edit, Agent
disable-model-invocation: true
metadata:
  version: "1.0.0"
  last_updated: "2026-10-30"
---

Apply the OpenSpec change named in the argument by handing its tasks to the `opsx-task-applier`
agent, one group at a time. You orchestrate and never implement: do not make a task's code changes
yourself, do not call `/opsx:apply`, and do not edit, copy or regenerate the `/opsx:*` commands. You
are the only writer of `tasks.md`. This is advisory: nothing blocks a session from running plain
`/opsx:apply`.

## Steps

1. **Pick the change.** Use the name in the argument. If it is missing, use the change the
   conversation is clearly about; otherwise run `openspec list --json`, ask the user to choose one and
   do nothing else until they do. Announce the change; work on that change only.
2. **Read its state.** Run `openspec status --change "<name>"` and
   `openspec instructions apply --change "<name>" --json`. Read the whole output; never cut it off
   with `head` or similar.
   - `state` is `blocked`: show the message and stop.
   - `state` is `all_done`: show the message, suggest `/opsx:archive`, and stop.
3. **Read the context.** Read every file under `contextFiles` before the first dispatch, and keep the
   `context` and `operationGuidance` the output carries in mind for the briefs.
4. **Check the agent.** Look for `opsx-task-applier.md` in `~/.claude/agents/` and in this project's
   `.claude/agents/`. If it is in neither, say so, name `Install-Toolkit.ps1` (`-Agent
   opsx-task-applier.md`) and stop. Do not copy the agent yourself.
5. **Find the groups.** A group is one `##` section of `tasks.md`. Take them in file order. Skip a
   section with no pending task. In a partly ticked section only the pending tasks go to the agent,
   so a re-run resumes.
6. **Announce the group**, then dispatch. Say: the group and its tasks, the files you expect the agent
   to touch, a rough time estimate labeled as an estimate, that there is no live timer, how to open the
   agent's transcript (its row in the agent panel then Enter, or `/tasks`), and its turn limit
   (`maxTurns` in the agent file).
7. **Dispatch** one group with the Agent tool (`opsx-task-applier`) and wait for its report before
   anything else. The prompt carries:
   - the change name and the verbatim text of each pending task of the group, never a paraphrase;
   - the paths of the `contextFiles`, to read before changing anything;
   - the `operationGuidance` entries that apply to this group;
   - that it must not edit `tasks.md` and must report as its own instructions say.
8. **Record the outcome.** Say in one line whether the group is done, failed or blocked. For each
   task whose report carries a `result:` clause, copy that clause verbatim after the task in
   `tasks.md` and tick its box. Tick nothing else.
   - **`blocked: <question>`**: record the tasks that have a clause, ask the user the question, then
     dispatch the rest of the group again with the answer added to the prompt.
   - **A task failed**: record the tasks that have a clause, stop, and report what failed.
   - **Turn limit reached**: record the finished tasks and dispatch the rest of the group, or ask the
     user if the report shows a problem.
9. **Stop for a commit.** When all of the group's tasks are done, stop and follow the
   `jois-git-commit-hygiene` rule for the group. Stage with `git add` by explicit path, and make no
   commit in the turn you stage. The agent commits nothing. Take the next group only after that
   commit is done or the user says to go on.
10. **Next group.** Repeat from step 6 until no group has a pending task, then run step 2 again and
    follow what it says.

State lives in `tasks.md` and the CLI, so if the session is compacted or ends, run
`/jois-code:apply <change>` again and it resumes from the pending tasks.
