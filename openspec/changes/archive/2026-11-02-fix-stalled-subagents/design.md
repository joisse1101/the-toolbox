# Design

## Context

- See `proposal.md` for why.
- Step 7 of `toolkit/commands/jois-code/apply.md` dispatches `opsx-task-applier` and only waits for its report.
- A waiting session is woken only by an event, so a stalled subagent produces none.
- The agent's `Bash` `PreToolUse` hook (a check that runs before a tool call and can refuse it) matches only `git commit`, `git push` and `gh`.
- Hooks run before the permission check, so a refusal by a hook returns to the agent at once and raises no prompt.
- The transcript path `subagents/agent-<id>.jsonl` comes from the issue.
- Whether a background dispatch returns the subagent id, and whether `Monitor` wakes a waiting session, are unchecked.

## Goals / Non-Goals

**Goals:**

- The user learns within about 3 minutes that a subagent is quiet and where to look.
- The subagent raises fewer permission prompts.

**Non-Goals:**

- No change to permission rules and no allow rule for `rm`.
- No way for the main session to answer the subagent's prompt. It tells the user where to approve.
- No stall watch for plain `/opsx:apply`, which stays untouched.

## Decisions

### Decision: Watch the transcript file with `Monitor`

- A `Monitor` loop compares the file's modified time and prints one line when it has been unchanged for 180 seconds.
- That line wakes the main session, which writes the alert in its own reply.
- The loop exits when the report arrives.
- Alternative: `ScheduleWakeup` polling. It wakes on a timer even when nothing is wrong, and the issue names `Monitor`.
- Alternative: no watch, a longer announcement in step 6. It still leaves the session silent during a stall.

### Decision: A new step 7 starts the watch, and the dispatch becomes step 8

- The watch starts right after the dispatch call returns the subagent id.
- If no id or no file is found, the command says the watch did not start and carries on. The dispatch itself never depends on the watch.
- `Monitor` is added to `allowed-tools`.
- The watch command must not need approval itself. It should be a read-only loop over one file.
- Verify this on the first run (task 2.3). If the watch command prompts, the command still works but says so.

### Decision: The alert hedges and shows evidence

- A quiet file is also what a long `npm test` or build looks like, because the file changes only when a tool call starts or ends.
- The alert therefore says "looks stalled, probably waiting for an approval" and shows the last tool call, so the user can tell a long command from a prompt.
- It repeats where to open the transcript (the agent panel row, then Enter), as step 6 does.

### Decision: Refuse `rm -rf` in the hook, and ask for plain commands in the instructions

- The hook refuses `rm` with a flag group holding both `r` and `f` (`-rf`, `-fr`, `-Rf`), with an error saying the cleanup is left for the main session.
- A refusal fails fast. Without it, the call hangs on a prompt nobody can see.
- Alternative: instruction only. The model can ignore it, and the stall costs minutes.
- Chained `cd` is instruction only: a pattern for it is fragile and would also block harmless commands.
- The existing `git`/`gh` check stays as it is. The new check is a second `if` in the same inline command.

## Risks / Trade-offs

- [`Monitor` does not wake a waiting session] → Task 2.3 checks it. If it fails, fall back to `ScheduleWakeup` and update this design.
- [A long command is flagged as stalled] → Hedged wording plus the last tool call.
- [The hook pattern misses `rm --recursive --force` or other forms] → The instruction still forbids them. The hook is a backstop, not a full filter.
- [Installed copies lag the repo] → The user reruns `Install-Toolkit.ps1`. The version bumps make a stale copy visible.

## Open Questions

- None that change the approach. The unchecked facts above are verified in the tasks.
