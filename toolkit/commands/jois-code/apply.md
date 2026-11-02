---
name: "JOIS: Apply"
description: "Apply an OpenSpec change one group of tasks at a time: hand each group to opsx-task-applier, record its results in tasks.md, stop for a commit after each group"
allowed-tools: Bash(openspec:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Read, Edit, Agent, Monitor
disable-model-invocation: true
metadata:
  version: "1.1.0"
  last_updated: "2026-11-02"
---

Apply the OpenSpec change named in the argument by handing its tasks to the `opsx-task-applier` agent, one group at a time.

## Rules

- You orchestrate. You never implement a task.
- Do not make a task's code changes yourself.
- Do not call `/opsx:apply`.
- Do not edit, copy or regenerate the `/opsx:*` commands.
- You are the only writer of `tasks.md`.
- This is advisory. Nothing blocks a session from running plain `/opsx:apply`.

## Steps

1. **Pick the change.**
   - Use the name in the argument.
   - If it is missing, use the change the conversation is clearly about.
   - Otherwise run `openspec list --json` and ask the user to choose one.
   - Do nothing else until they choose.
   - Announce the change.
   - Work on that change only.
2. **Read its state.**
   - Run `openspec status --change "<name>"`.
   - Run `openspec instructions apply --change "<name>" --json`.
   - Read the whole output.
   - Never cut the output off with `head` or similar.
   - If `state` is `blocked`, show the message and stop.
   - If `state` is `all_done`, show the message, suggest `/opsx:archive`, and stop.
3. **Read the context.**
   - Read every file under `contextFiles` before the first dispatch.
   - Keep the `context` and `operationGuidance` from the output in mind for the briefs.
4. **Check the agent.**
   - Look for `opsx-task-applier.md` in `~/.claude/agents/` and in this project's `.claude/agents/`.
   - If it is in neither, say so, name `Install-Toolkit.ps1` (`-Agent opsx-task-applier.md`) and stop.
   - Do not copy the agent yourself.
5. **Find the groups.**
   - A group is one `##` section of `tasks.md`.
   - Take the groups in file order.
   - Skip a section with no pending task.
   - In a partly ticked section, send the agent only the pending tasks.
   - A re-run then resumes where the last one stopped.
6. **Announce the group.**
   - Do this before the dispatch.
   - Say the group and its tasks.
   - Say the files you expect the agent to touch.
   - Say a rough time estimate, labeled as an estimate.
   - Say that there is no live timer.
   - Say how to open the agent's transcript: its row in the agent panel then Enter, or `/tasks`.
   - Say its turn limit (`maxTurns` in the agent file).
7. **Dispatch the group.**
   - Use the Agent tool with `opsx-task-applier`, in the background, so step 8 can start the watch.
   - Note the agent id the call returns.
   - Start the watch (step 8) before you wait for the report.
   - Do nothing else until the report arrives.
   - The prompt carries the change name and the verbatim text of each pending task of the group.
   - Never paraphrase a task.
   - The prompt carries the paths of the `contextFiles`, to read before changing anything.
   - The prompt carries the `operationGuidance` entries that apply to this group.
   - The prompt says the agent must not edit `tasks.md`.
   - The prompt says the agent must report as its own instructions say.
8. **Watch the agent.**
   - Right after the dispatch, start a watch with the `Monitor` tool on the agent's transcript file, `subagents/agent-<id>.jsonl`.
   - Find the file with Glob: `**/subagents/agent-<id>.jsonl` under `~/.claude/projects/`.
   - The watch is a read-only loop that only reads the file's modified time and prints one line when it has not changed for 180 seconds. Use this, with `<file>` set to the path found:
     ```
     f="<file>"; while [ -f "$f" ]; do now=$(date +%s); m=$(stat -c %Y "$f"); if [ $((now - m)) -ge 180 ]; then echo "QUIET 180s: $f"; break; fi; sleep 15; done
     ```
   - The loop never writes anything and never edits a permission rule.
   - If the id or the file cannot be found, say the watch did not start and carry on. The dispatch never depends on the watch.
   - If the watch command itself raises a permission prompt, say so and carry on.
   - When the loop prints its line, you write the alert in your own reply. The loop does not.
   - Say that the agent looks stalled and is probably waiting for an approval.
   - Say that 3 minutes passed with no change in its transcript.
   - Show its last tool call. Read the end of the transcript file to find it.
   - Say that a long command, such as a test run or a build, looks the same, so the last tool call tells which it is.
   - Say where to open the transcript: its row in the agent panel then Enter, or `/tasks`. Approve the prompt there.
   - Do not report that all is well while the file is unchanged.
   - Do not edit any settings or permission rule.
   - When the report arrives, stop the watch.
9. **Record the outcome.**
   - Say in one line whether the group is done, failed or blocked.
   - For each task whose report carries a `result:` clause, copy that clause verbatim after the task in `tasks.md`.
   - Tick the box of that task.
   - Tick nothing else.
   - If the report ends in `blocked: <question>`:
     - Record the tasks that have a clause.
     - Ask the user the question.
     - Dispatch the rest of the group again with the answer added to the prompt.
   - If a task failed:
     - Record the tasks that have a clause.
     - Stop and report what failed.
   - If the agent reached its turn limit:
     - Record the finished tasks.
     - Dispatch the rest of the group.
     - Ask the user instead if the report shows a problem.
10. **Stop for a commit.**
   - When all of the group's tasks are done, stop.
   - Follow the `jois-git-commit-hygiene` rule for the group.
   - Stage with `git add` by explicit path.
   - Make no commit in the turn you stage.
   - The agent commits nothing.
   - Take the next group only after that commit is done or the user says to go on.
11. **Take the next group.**
    - Repeat from step 6 until no group has a pending task.
    - Then run step 2 again and follow what it says.

## Resuming

- State lives in `tasks.md` and the CLI.
- If the session is compacted or ends, run `/jois-code:apply <change>` again.
- It resumes from the pending tasks.
