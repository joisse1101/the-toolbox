# Proposal

## Why

- A background `opsx-task-applier` subagent can wait on a permission prompt that nobody can see.
- The main session then hears nothing and keeps reporting that all is well.
- In one run the stall lasted about 21 minutes (1,279 seconds) until the user interrupted. The trigger was a Bash call of the form `rm -rf <path>; ls <path>; cd <repo> && git status --short`.
- GitHub issue #55 tracks it.

## What Changes

- `/jois-code:apply` watches each dispatched subagent.
  - It starts a `Monitor` on the subagent's transcript file, `subagents/agent-<id>.jsonl`.
  - If the file has not changed for 3 minutes, the main session says in its own reply that the subagent looks stalled and is probably waiting for a permission approval.
  - The message shows the subagent's last tool call and says where to approve it (the agent panel row, then Enter; step 6 already says how).
  - The watch stops when the report arrives.
  - If the transcript path cannot be found, the command says the watch did not start instead of skipping it silently.
- `opsx-task-applier` triggers fewer prompts.
  - A new "Bash discipline" section tells it to run one plain command per Bash call.
  - It never chains `cd` with other commands and uses the absolute paths it was given.
  - It never runs `rm -rf` and reports any cleanup as left for the main session.
  - Its `Bash` `PreToolUse` hook also refuses `rm -rf` at once with a message, so the call fails fast instead of hanging on a prompt.
- Permission rules do not change, and no allow rule for `rm` is added, because it would widen what unseen background agents can delete.
- Both files get a minor version bump.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`:
  - "Task agent applies one group of OpenSpec tasks" gains the Bash rules and the `rm -rf` hook block.
  - "Apply orchestrator dispatches one group at a time" gains the stall watch.
  - The command's allowed tools gain `Monitor`.

## Impact

- `toolkit/agents/opsx-task-applier.md`: new section, hook change, version 1.2.2 to 1.3.0.
- `toolkit/commands/jois-code/apply.md`: new watch step, `Monitor` in `allowed-tools`, version 1.0.1 to 1.1.0.
- `openspec/specs/toolkit-skills/spec.md`: updated at archive from this change's delta.
- Users reinstall with `Install-Toolkit.ps1` to get the new agent and command.
- Unchecked assumptions, to settle in design:
  - A background dispatch returns the subagent id.
  - `Monitor` wakes a waiting main session.
  - The watch command does not itself trigger a permission prompt.
