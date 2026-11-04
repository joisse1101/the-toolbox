---
name: "JOIS: Apply"
description: "Apply an OpenSpec change one group of tasks at a time: hand each group to opsx-task-applier, record its results in tasks.md, check it with opsx-test-runner, then commit it by itself on an unprotected branch (never main or master, never a push) or stop for the confirmation word"
allowed-tools: Bash(openspec:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch --show-current:*), Read, Edit, Agent, Monitor
disable-model-invocation: true
metadata:
  version: "1.4.0"
  last_updated: "2026-11-04"
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
   - A commit-stop line in `operationGuidance` (such as "name a confirmation word and never commit in the turn you stage") does not govern this command's group commits.
   - Step 10 owns those commits and decides when to commit or stop.
4. **Check the agent.**
   - Look for `opsx-task-applier.md` in `~/.claude/agents/` and in this project's `.claude/agents/`.
   - If it is in neither, say so, name `Install-Toolkit.ps1` (`-Agent opsx-task-applier.md`) and stop.
   - Do not copy the agent yourself.
   - Also look for `opsx-test-runner.md` in the same two folders.
   - If it is in neither, say so and name `Install-Toolkit.ps1` (`-Agent opsx-test-runner.md`).
   - Do not stop for this. Remember it, and step 10 takes the fallback.
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
     - A group whose tasks are all done and whose failures are all explained goes on to step 10.
   - If the agent reached its turn limit:
     - Record the finished tasks.
     - Dispatch the rest of the group.
     - Ask the user instead if the report shows a problem.
10. **Commit the group.**
   - Do this when all of the group's tasks are done.
   - The purpose is to commit a checked group by itself, and to ask only when something is doubtful.
   - The agents commit nothing. Only you commit, as below.
   - **The fallback** is the one way to handle every doubtful case.
     - Follow the confirmation path of the `jois-git-commit-hygiene` rule: stage by explicit path, print the staged summary and the proposed message, name a confirmation word, end the turn.
     - Say which condition sent you there.
     - Take the next group only after that commit is done or the user says to go on.
   - Below, "fall back" means the fallback.
   - Read the branch with `git branch --show-current`.
     - An empty result (detached HEAD), `main`, `master` or a failed command counts as protected: fall back.
   - If step 4 found `opsx-test-runner` missing: fall back.
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
     - If the rerun is still doubtful, fall back and say why.
   - **A non-zero exit code** starts the fix loop of step 9.
     - Pass it the failing command and its exact output.
     - Rerun `opsx-test-runner` after each fix round, with the same exit-code judging as above.
     - Go on only when every command shows exit code 0 and every failure is explained.
     - If the loop ends in a question to the user, wait for the answer. Then fall back only after the failures are explained.
   - **No rerun** for these: fall back at once.
     - No test command found, or a suite that could not run for another reason (such as missing dependencies).
     - A protected branch.
     - A missing agent.
     - An unrelated change.
   - Run `git status` and `git diff --stat`.
     - Ignore `openspec/changes/<name>/`, including `tasks.md`, in this check.
     - Never stage that folder in this step. It is committed at archive.
     - A tracked file outside the group's reported files and outside that folder changed: fall back.
     - Something unrelated outside that folder already staged or edited: fall back.
   - **Split the group** when it is more than one concern (over about 200 lines or 5 files, or more than one layer).
     - Cut it by the one-concern list of the `jois-git-commit-hygiene` rule.
       - A deletion, a rename or move, a regenerated asset, a lockfile and a format-only change are each their own concern.
       - Tests and docs go with the change they describe.
     - Cut the hand-written changes by task, using the files each task's report lists.
       - Tasks that share a file, or a change and its tests, merge into one concern.
     - Run the tests once for the whole group before the first commit. Do not rerun them after each commit.
     - If one changed file holds two concerns: fall back and name the file. `git add -p` does not work here.
   - Otherwise stage each concern in turn, in the order of the group's tasks.
     - Stage with `git add <explicit paths>`.
     - Commit with its own `type(scope): subject` message: lowercase, imperative, no trailing period.
     - Build each message from the group's heading and that concern's tasks.
     - Print the short hash and the message after each commit.
     - A group of one concern is one commit.
     - Never use `git add .`, `git add -A`, `git commit -a`, `--amend` or `--no-verify`.
     - Never run `git push`, on any branch. It is not in `allowed-tools` on purpose.
   - If a pre-commit hook rejects a commit, stop and report it. Do not retry and do not fall back.
   - If `git commit` fails for another reason, stop and report the error. Do not fall back.
   - If a later commit of the split fails, stop and report which commits were made and which were not.
     - Leave the remaining files unstaged. Do not retry and do not use `--no-verify`.
   - After the last commit, take the next group.
11. **Take the next group.**
    - Repeat from step 6 until no group has a pending task.
    - Then run step 2 again and follow what it says.

## Resuming

- State lives in `tasks.md` and the CLI.
- If the session is compacted or ends, run `/jois-code:apply <change>` again.
- It resumes from the pending tasks.
