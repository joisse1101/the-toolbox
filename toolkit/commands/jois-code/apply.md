---
name: "JOIS: Apply"
description: "Apply an OpenSpec change or a slice one group of tasks at a time: hand each group to opsx-task-applier, record its results in tasks.md, then commit it by itself on an unprotected branch (never main or master, never a push), or stop with nothing committed in a doubtful case. The last group's code is reviewed with /jois-code:review and its findings fixed before the tests, which run once, as the task in the last group"
allowed-tools: Bash(openspec:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch --show-current:*), Bash(node *jois-story-plan*read-diagrams.mjs*), Skill, Read, Edit, Glob, Agent, Monitor
disable-model-invocation: true
metadata:
  version: "1.10.0"
  last_updated: "2026-11-10"
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
   - Do not stop for this yet. Remember it. Before the dispatch of the last group, say it again and stop, because that group's test task needs the runner. Earlier groups are not held up.
5. **Find the groups.**
   - A group is one `##` section of `tasks.md`.
   - Take the groups in file order.
   - Skip a section with no pending task.
   - In a partly ticked section, send the agent only the pending tasks.
   - A re-run then resumes where the last one stopped.
   - **Left-over edits from an interrupted run.** Before the first dispatch of this run, run `git status` and `git diff --stat`, ignoring the change's or slice's own folder as step 10 does.
     - A clean tree needs nothing.
     - Otherwise an earlier run was most likely stopped inside a group, after its agent edited files and before the commit. Name the changed files, the first pending group, and the pending tasks the edits most likely belong to.
     - Ask once, with `AskUserQuestion`: keep the edits as the starting point (recommended), or stop so the user can set them aside. Dispatch nothing before the answer.
     - On keep, tell the agent in the group's brief which files already hold a draft of its pending tasks, to read them first, then verify and finish them. Step 10 then counts those files as the group's.
     - On stop, end the command with nothing dispatched.
   - Take the last group in two parts. Part one is every task except its test task. It goes through steps 6 to 10, commit included, as a group of its own. Then step 10a (the review) runs. Part two is the test task, run as step 7 says. A fix the tests need is committed by step 10 as its own commit.
   - A group that has no test task, or a change whose last group is only the test task, skips part one. Step 10a still runs once before the test task, on whatever the branch holds.
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
   - **The test task.** The last group ends with a task that runs the project's tests. Do not send it to `opsx-task-applier`, which cannot start another agent. Send the group's other tasks first, run the review (step 10a) when they are committed, then run the test task yourself, only when the review has no failure left:
     - Dispatch `opsx-test-runner` in the background. The prompt carries the files all groups so far changed, taken from the reports.
     - Start the watch (step 8) and wait for the report.
     - Judge the report by exit codes only, never by its wording. The tests passed only when every reported command shows exit code 0. The runner's exact line `exit code 0 (the tool showed no error)` counts as exit code 0.
     - Wording such as "passed" or a counts line never counts. A missing exit code or a non-zero exit code is not passed.
     - If no test command was found, or a suite could not run (such as missing dependencies), stop and show the reason. The fix loop cannot repair that.
     - If a command failed, or an exit code is missing, run the fix loop of step 9 with the failing command and its exact output.
     - On a pass, tick the task and copy under it a `result:` line built from the commands and exit codes the runner reported. In the slice form, put it on its own indented line after the task's `Verify:` line.
8. **Watch the agent.**
   - This covers every `opsx-task-applier` dispatch (step 7 and the fix rounds of step 9) and every `opsx-test-runner` dispatch (the test task of step 7).
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
   - Tick nothing else. A task the report calls failed gets no tick, even when it carries a clause. Copy its clause under it anyway, unticked.
   - In the slice form, copy the clause on its own indented line directly after the task's `Verify:` line, so the slice's task format stays valid. Tick only a task whose report carries a `result:` clause.
   - If the report ends in `blocked: <question>`:
     - Record the tasks that have a clause.
     - Ask the user the question.
     - Dispatch the rest of the group again with the answer added to the prompt.
   - If a task failed, or the test task's run shows a failing test command, run the **fix loop**:
     - Record the tasks that have a clause.
     - A failure is a task the report calls failed, a test command with a non-zero exit code, or a failure the report does not explain.
     - Do not ask the user whether to go on.
     - Each round is a fresh `opsx-task-applier` dispatch, in the background, with the watch of step 8.
     - The brief carries the change name, the failing command, its exact output, the files the group touched and the instruction to find the cause and fix it within the group's tasks.
     - The brief says the failure is the task, and that the agent must report as its own instructions say, with the `Failures` part.
     - After each round for a failing test command, dispatch `opsx-test-runner` again and judge it by exit codes as in step 7.
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
   - The purpose is to commit a checked group by itself, and to stop when something is doubtful.
   - The agents commit nothing. Only you commit, as the "Apply flows" clause of the `jois-git-commit-hygiene` rule says.
   - **A stop with nothing committed** is the one way to handle every doubtful case.
     - Commit nothing and stage nothing.
     - Say which condition failed, and what the user can do about it (switch branch, move the foreign change).
     - Name no confirmation word and do not ask for one.
     - End the command. Work already done stays in the tree and in `tasks.md`, and a rerun resumes from the pending tasks.
   - Below, "stop" means this stop.
   - Read the branch with `git branch --show-current`.
     - An empty result (detached HEAD), `main`, `master` or a failed command counts as protected: stop and say the branch is protected.
   - Run no test here. Tests run only through the test task in the last group of `tasks.md` (step 7). The behavioural check of step 10a runs the project's own checks in a throwaway copy; it is not the test task.
   - Run `git status` and `git diff --stat`.
     - Ignore `openspec/changes/<name>/`, including `tasks.md`, in this check.
     - Never stage that folder in this step. `/jois-code:archive` does not stage it either, so it is never committed by these commands. If anything under it is already staged, stop and name it. Read the index before any `git add`, and leave what was staged as it is.
     - In the slice form, ignore `<backlog>/slices/` in this check too, and never stage or commit anything under it. If a file under it is already staged, stop and name it. It is not tracked by git here, so the ticks stay local, and `/jois-code:archive` does not stage it either.
     - A tracked file outside the group's reported files and outside that folder changed: stop and name the file.
     - Something unrelated outside that folder already staged or edited: stop and name it.
   - **Split the group** when it is more than one concern (over about 200 lines or 5 files, or more than one layer).
     - Cut it by the one-concern list of the `jois-git-commit-hygiene` rule.
       - A deletion, a rename or move, a regenerated asset, a lockfile and a format-only change are each their own concern.
       - Tests and docs go with the change they describe. A config change goes with the task that needs it.
     - Cut the hand-written changes by task, using the files each task's report lists.
       - Tasks that share a file, or a change and its tests, merge into one concern.
     - A single task over the size limit has no cut: treat it as one concern and commit it as one.
     - If one changed file holds two concerns: stop with nothing committed and name the file. `git add -p` does not work here.
   - Stage each concern in turn, in the order of the group's tasks. This holds for a group of one concern too.
     - Stage with `git add <explicit paths>`, and commit with `git commit -- <the same paths>` so nothing else staged is swept in.
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
10a. **Review before the tests.**
   - Do this once, when every task of the change except the test task is done and committed, and before the test task. A stop in step 10 ends the command first, so the review never runs on uncommitted work.
   - Check that `jois-code/review.md` is installed in `~/.claude/commands/` or this project's `.claude/commands/`. If not, say the review was not run and why, name `Install-Toolkit.ps1` (`-Command jois-code`), never count the review as passed, and go on to the test task.
   - Start the review with the Skill tool on `jois-code:review`. In the slice form the argument is `slice <backlog>/<slice>`. In the OpenSpec form there is no argument: the review runs the static check on the current branch against `main` and says the behavioural check was not run. Pass no effort level, no `--comment` and never `--fix`. Answer none of the questions the review or validate puts to the user.
   - If the Skill tool refuses to start it, print the line `/jois-code:review slice <backlog>/<slice>` (or `/jois-code:review`) for the user, say the review was not run, and go on to the test task.
   - Read the report as two parts and merge nothing into one status.
     - Every finding of part 1 (static) is a **failure**, except one the report marks as an optional cleanup (reuse, simplification, efficiency) or as uncertain. List those in the final summary and do not fix them.
     - Every `not met` verdict of part 2 (behavioural) is a failure. A `could not test` verdict is listed and not fixed.
   - With no failure, say so in one line and take the test task.
   - With a failure, run the **fix loop** of step 9, with these changes:
     - The brief carries the change or slice name, the finding or verdict in the review's own words, the file and line it names, and the files the change touched.
     - Fix every failure of the round in one dispatch when they touch the same files, else one dispatch per concern.
     - After each round, commit the fix with step 10's rules, as its own commit, usually `fix(<scope>): <subject>`. A fix that changes no file is not committed.
     - Then run the review again. Stop the loop and ask the user in the cases step 9 names, and also when a finding comes back unchanged after a round meant to fix it.
     - **Stop after two fix rounds.** A static review finds new edge cases on every pass, some in the last fix, so the loop does not converge by itself. After the second round's review, list every failure still open and ask once, with `AskUserQuestion`: fix the ones you name in one last round and then take the test task, or take the test task now and record the rest. Recommend fixing a `not met` verdict, a crash, and a regression from an earlier fix round, and recording the rest.
     - Each failure the user chose not to fix is **explained**: list it under "Known, not fixed" in the final summary, with the user's choice as the reason.
   - Never start the test task while a failure of the review is unfixed or unexplained.
   - Do not edit the code yourself, and do not edit `tasks.md` for the review.

11. **Take the next group.**
    - Repeat from step 6 until no group has a pending task.
    - The review of step 10a runs once before the test task, and the test task in the last group runs as step 7 says. Its failures run the fix loop of step 9, and the loop asks the user if a failure stays unexplained.
    - Then run step 2 again and follow what it says.
    - In the slice form, read the slice's `tasks.md` again instead. If no group has an unticked task, say the slice is built and name the next stage, and stop. The next stage is `/jois-code:archive slice <backlog>/<slice>` when the slice's `validation.md` says `Validated: yes` at the current commit, and `/jois-code:validate slice <backlog>/<slice>` first otherwise (a fix commit after the review makes the earlier validation out of date). Name `jois-story-plan` only for the next slice, after archive. Never suggest `/opsx:archive`.

## Resuming

- State lives in `tasks.md` and the CLI. In the slice form it lives in the slice's `tasks.md` alone.
- If the session is compacted or ends, run `/jois-code:apply <change>` or `/jois-code:apply slice <backlog>/<slice>` again.
- It resumes from the pending tasks.
