---
name: "JOIS: Apply"
description: "Apply an OpenSpec change or a slice one group of tasks at a time: hand each group to opsx-task-applier, record its results in tasks.md, check it with opsx-test-runner, then commit it by itself on an unprotected branch (never main or master, never a push), defer the commit while a named pending task fixes a failing test, or stop with nothing committed in a doubtful case"
allowed-tools: Bash(openspec:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch --show-current:*), Bash(node *jois-story-plan*read-diagrams.mjs*), Read, Edit, Glob, Agent, Monitor
disable-model-invocation: true
metadata:
  version: "1.7.0"
  last_updated: "2026-11-05"
---

Apply an OpenSpec change, or a slice written by `jois-story-plan`, by handing its tasks to the `opsx-task-applier` agent, one group at a time.

## Forms

The argument alone picks the form. Never guess between them.

- `/jois-code:apply <change>` is the OpenSpec form. A bare name is always an OpenSpec change, even when a slice has the same name.
- `/jois-code:apply slice <backlog>/<slice>` is the slice form. It does not call `openspec`.
- `slice` alone, `slice <backlog>` with no slice name, or `slice <backlog> <slice>` with a space instead of `/`: ask for `<backlog>/<slice>` and do nothing else.

Steps 1 to 3 differ by form. Steps 4 to 11 are shared.

## Rules

- You orchestrate. You never implement a task.
- Do not make a task's code changes yourself.
- Do not call `/opsx:apply`.
- Do not edit, copy or regenerate the `/opsx:*` commands.
- You are the only writer of `tasks.md`.
- This is advisory. Nothing blocks a session from running plain `/opsx:apply`.

## Slice form: steps 1 to 3

A slice is the folder `<backlog>/slices/<slice>/` of the data folder the plan skill reads. It holds `tasks.md` and `UC-<slice>.md`. Use these steps instead of steps 1 to 3 below.

1. **Pick the slice.**
   - Take `<backlog>` and `<slice>` from the argument `slice <backlog>/<slice>`.
   - Announce the slice `<slice>` of the backlog `<backlog>`.
   - Work on that slice only.
2. **Read its files.**
   - Find `tasks.md` with Glob: `**/<backlog>/slices/<slice>/tasks.md`.
   - Read `tasks.md` and `UC-<slice>.md` from that folder.
   - If the folder or `tasks.md` does not exist, say what is missing, point to `jois-story-plan` and stop.
   - If Glob finds more than one match (for example a copy under `.trees/`), list them and ask which one. Dispatch nothing until the user answers.
   - If `tasks.md` has no task line, say the slice has no tasks, point to `jois-story-plan` and stop. Do not say the slice is built.
   - A group is one `## <flow>` section of `tasks.md`.
   - A task is a checkbox line `- [ ] T-<slice>-<name> <title>` with its `Satisfies:` and `Verify:` lines.
   - If no group has an unticked task, skip step 3 and step 4, say the slice is built, name `jois-story-plan` for the next slice and stop.
3. **Check the slice is current.**
   - Look for `read-diagrams.mjs` in `~/.claude/skills/jois-story-plan/` and in this project's `.claude/skills/jois-story-plan/`.
   - If it is in neither, say the plan skill is not installed, name `Install-Toolkit.ps1` and stop.
   - Run `node <that folder>/read-diagrams.mjs <backlog> --slice <slice>` and read the whole output.
   - Never re-implement the comparison yourself, and never redraw the slice.
   - The script repairs a shifted story ID in the slice's `source.json`. That write stays inside the untracked slice folder.
   - If the output says `STALE`, or has a `changed:`, `missing:`, `new:` or `ambiguous:` line, or the command fails: dispatch nothing. Name each story by its Title, say the slice must be redrawn with `jois-story-plan`, and stop.
   - A `healed:` line alone does not make the slice stale. Mention it and go on.
   - Keep the text of `UC-<slice>.md` in mind for the briefs.

## OpenSpec form: steps 1 to 3

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
   - A commit-stop line in `operationGuidance` (an older project's line that tells the agent to stop before each commit) does not govern this command's group commits.
   - Step 10 owns those commits and decides when to commit or stop with nothing committed.

## Shared steps 4 to 11

Both forms run these. "The change" below means the slice in the slice form.

4. **Check the agent.**
   - Look for `opsx-task-applier.md` in `~/.claude/agents/` and in this project's `.claude/agents/`.
   - If it is in neither, say so, name `Install-Toolkit.ps1` (`-Agent opsx-task-applier.md`) and stop.
   - Do not copy the agent yourself.
   - Also look for `opsx-test-runner.md` in the same two folders.
   - If it is in neither, say so and name `Install-Toolkit.ps1` (`-Agent opsx-test-runner.md`).
   - Do not stop for this yet. Remember it, and step 10 stops with nothing committed and names this condition.
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
   - In the slice form the prompt carries `<backlog>/<slice>` as the name and each task with its `Satisfies:` and `Verify:` lines, and the path of `UC-<slice>.md`, to read first.
   - The prompt carries the paths of the `contextFiles`, to read before changing anything.
   - The prompt carries the `operationGuidance` entries that apply to this group.
   - In the slice form there are no `contextFiles` and no `operationGuidance`.
   - The prompt says the agent must not edit `tasks.md`.
   - The prompt says the agent must report as its own instructions say.
8. **Watch the agent.**
   - This covers both `opsx-task-applier` (step 7) and `opsx-test-runner` (step 10).
   - Right after each dispatch, start a watch with the `Monitor` tool on that agent's transcript file, `subagents/agent-<id>.jsonl`.
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
   - In the slice form, copy the clause on its own indented line directly after the task's `Verify:` line, so the slice's task format stays valid. Tick only a task whose report carries a `result:` clause.
   - If the report ends in `blocked: <question>`:
     - Record the tasks that have a clause.
     - Ask the user the question.
     - Dispatch the rest of the group again with the answer added to the prompt.
   - If a task failed, or step 10 hands you a failing test command, run the **fix loop**:
     - Record the tasks that have a clause.
     - A failure is a task the report calls failed, a test command with a non-zero exit code, or a failure the report does not explain.
     - Do not ask the user whether to go on.
     - Each round is a fresh `opsx-task-applier` dispatch, in the background, with the watch of step 8.
     - The brief carries the change name, the failing command, its exact output, the files the group touched and the instruction to find the cause and fix it within the group's tasks.
     - The brief says the failure is the task, and that the agent must report as its own instructions say, with the `Failures` part.
     - After each round, check the `Failures` part. A failure is **explained** only when it gives the command, the exact output line, the cause and whether it is fixed.
     - A failure called "not caused by this group" counts as explained only when the report gives evidence, such as the same failure on `main`. Without evidence it is unexplained.
     - Ask the user only in these three cases, say which one applies and show the failure:
       - The report ends in `blocked: <question>`. Ask the question.
       - A second round ends with a failure still unexplained.
       - A failure has the same command and the same output line as before a round meant to fix it. Ask without a further round.
     - Never take the next group while a failure of the current group is unexplained.
     - A **deferrable failure** is an explained failure that also names, as its fix, a task that is still pending in a later group.
       - It gives the command, the exact output line, the cause and the task number.
       - Check the named task against `tasks.md` yourself: it must exist, sit in a later group and be unticked. The report's word alone is not enough.
       - "A later group will fix it" with no task named is not deferrable. A task that is ticked, or not in `tasks.md`, is not deferrable.
       - A deferrable failure does not run the fix loop. Step 10 holds the commit instead.
     - A group whose tasks are all done and whose failures are all explained goes on to step 10.
   - If the agent reached its turn limit:
     - Record the finished tasks.
     - Dispatch the rest of the group.
     - Ask the user instead if the report shows a problem.
10. **Commit the group.**
   - Do this when all of the group's tasks are done.
   - The purpose is to commit a checked group by itself, and to stop when something is doubtful.
   - The agents commit nothing. Only you commit, as the "Apply flows" clause of the `jois-git-commit-hygiene` rule says.
   - **A stop with nothing committed** is the one way to handle every doubtful case.
     - Commit nothing and stage nothing.
     - Say which condition failed, and what the user can do about it (switch branch, install the agent, fix the test, move the foreign change).
     - Name no confirmation word and do not ask for one.
     - End the command. Work already done stays in the tree and in `tasks.md`, and a rerun resumes from the pending tasks.
   - Below, "stop" means this stop.
   - Read the branch with `git branch --show-current`.
     - An empty result (detached HEAD), `main`, `master` or a failed command counts as protected: stop and say the branch is protected.
   - If step 4 found `opsx-test-runner` missing: stop, say the agent is missing and name `Install-Toolkit.ps1` (`-Agent opsx-test-runner.md`).
   - Dispatch `opsx-test-runner` with the Agent tool, in the background.
     - The prompt carries the files the group's reports say were changed.
     - Start the watch (step 8) and wait for the report.
   - Judge the report by exit codes only, never by its wording.
     - The tests passed only when every reported command shows exit code 0.
     - The runner's exact line `exit code 0 (the tool showed no error)` counts as exit code 0.
     - Wording such as "passed" or a counts line never counts.
     - No test command found, a suite that could not run, a missing exit code or a non-zero exit code: not passed, and show the failure.
   - **One rerun** for a fixable doubt.
     - A fixable doubt is a missing exit code, or a suite skipped for a folder problem.
     - Rerun `opsx-test-runner` once per group, in the background, with the exact commands written into the prompt.
     - Build the commands from `CLAUDE.md` and `package.json`, in the command's own folder-flag form (such as `npm --prefix <abs path> test`), never `cd`.
     - Start the watch (step 8) on the rerun too.
     - If the rerun shows exit code 0 for every command, the tests passed: go on.
     - If the rerun is still doubtful, stop and say why.
   - **A non-zero exit code** is judged first for deferral (the definition is in step 9).
     - If every failure is deferrable and this is not the last group: do not commit and do not stop.
       - Say which task each failure waits for.
       - Keep this group's changes uncommitted and take the next group.
       - After each later group, rerun `opsx-test-runner` with the same exit-code judging.
       - Keep holding while every failure still names a pending task.
       - When every command exits 0, stage and commit all held-back changes by explicit path, cut by concern as in the split rule below, then take the next group.
       - Never commit while any command is red.
     - Otherwise it starts the fix loop of step 9.
       - Pass it the failing command and its exact output.
       - Rerun `opsx-test-runner` after each fix round, with the same exit-code judging as above.
       - Go on only when every command shows exit code 0 and every failure is explained.
       - If the loop ends in a question to the user, wait for the answer. Then stop only after the failures are explained.
     - After the last group nothing is deferred: a red result runs the fix loop over the whole change, then asks the user if a failure stays unexplained.
   - **No rerun** for these: stop at once, with nothing committed, and name the condition.
     - No test command found, or a suite that could not run for another reason (such as missing dependencies).
     - A protected branch.
     - A missing agent.
     - An unrelated change.
   - Run `git status` and `git diff --stat`.
     - Ignore `openspec/changes/<name>/`, including `tasks.md`, in this check.
     - Never stage that folder in this step. It is committed at archive.
     - In the slice form, ignore `<backlog>/slices/` in this check too, and never stage or commit anything under it. It is not tracked by git here, so the ticks stay local.
     - A tracked file outside the group's reported files and outside that folder changed: stop and name the file.
     - Something unrelated outside that folder already staged or edited: stop and name it.
   - **Split the group** when it is more than one concern (over about 200 lines or 5 files, or more than one layer).
     - Cut it by the one-concern list of the `jois-git-commit-hygiene` rule.
       - A deletion, a rename or move, a regenerated asset, a lockfile and a format-only change are each their own concern.
       - Tests and docs go with the change they describe.
     - Cut the hand-written changes by task, using the files each task's report lists.
       - Tasks that share a file, or a change and its tests, merge into one concern.
     - Run the tests once for the whole group before the first commit. Do not rerun them after each commit.
     - A single task over the size limit has no cut: treat it as one concern and commit it as one.
     - If one changed file holds two concerns: stop with nothing committed and name the file. `git add -p` does not work here.
   - Stage each concern in turn, in the order of the group's tasks. This holds for a group of one concern too.
     - Stage with `git add <explicit paths>`.
     - Commit with its own `type(scope): subject` message: lowercase, imperative, no trailing period.
     - Take the type from what the concern does (feat, fix, docs, test and so on, as the rule lists).
     - Build each message from the group's heading and that concern's tasks.
     - Print the short hash and the message after each commit.
     - A group of one concern is one commit.
     - Never use `git add .`, `git add -A`, `git commit -a`, `--amend` or `--no-verify`.
     - Never run `git push`, on any branch. It is not in `allowed-tools` on purpose.
   - If a pre-commit hook rejects a commit, stop and report it. Do not retry.
   - If `git commit` fails for another reason, stop and report the error.
   - If a later commit of the split fails, stop and report which commits were made and which were not.
     - Leave the remaining files unstaged. Do not retry and do not use `--no-verify`.
   - After the last commit, take the next group.
11. **Take the next group.**
    - Repeat from step 6 until no group has a pending task.
    - While a commit is held back, step 10 reruns the tests after each group and commits the held-back changes once every command exits 0.
    - After the last group nothing is deferred: if a command is still red, run the fix loop over the whole change, then ask the user if a failure stays unexplained.
    - Then run step 2 again and follow what it says.
    - In the slice form, read the slice's `tasks.md` again instead. If no group has an unticked task, say the slice is built and name `jois-story-plan` for the next slice, and stop. Never suggest `/opsx:archive`.

## Resuming

- State lives in `tasks.md` and the CLI. In the slice form it lives in the slice's `tasks.md` alone.
- If the session is compacted or ends, run `/jois-code:apply <change>` or `/jois-code:apply slice <backlog>/<slice>` again.
- It resumes from the pending tasks.
