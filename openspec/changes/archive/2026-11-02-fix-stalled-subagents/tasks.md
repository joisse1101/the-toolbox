# Tasks

## 1. Task agent Bash rules

- [x] 1.1 Add a "Bash discipline" section to `toolkit/agents/opsx-task-applier.md` (one plain command per call, no chained `cd`, absolute paths, no `rm -rf`, cleanup left for the main session) and bump `metadata.version` to 1.3.0 and `last_updated`; verify with `cd toolkit; python check_toolkit.py` passing. result: `cd toolkit; python check_toolkit.py` -> "toolkit check passed"
- [x] 1.2 Extend the `Bash` `PreToolUse` hook to refuse `rm` with `-rf`, `-fr` or `-Rf`, with the message saying cleanup is left for the main session; verify by piping sample tool-call JSON for `rm -rf x`, `rm -fr x`, `git status` and `git commit` into the hook command and seeing exit 2 for the first, second and fourth and exit 0 for the third. result: mock JSON piped into the hook command via PowerShell -> `rm -rf x` exit 2, `rm -fr x` exit 2, `rm -Rf x` exit 2, `git status` exit 0, `git commit -m x` exit 2, `rm x` exit 0; `cd toolkit; python check_toolkit.py` -> "toolkit check passed"

## 2. Apply orchestrator watch

- [x] 2.1 Add `Monitor` to `allowed-tools` in `toolkit/commands/jois-code/apply.md` and add a step that starts a watch on `subagents/agent-<id>.jsonl` right after the dispatch, stops it when the report arrives and says so when the file cannot be found; bump `metadata.version` to 1.1.0; verify with `python check_toolkit.py` passing. result: `cd toolkit; python check_toolkit.py` -> "toolkit check passed"; `Monitor` added to `allowed-tools`, version 1.1.0, new step 8 "Watch the agent" after the dispatch, later steps renumbered
- [x] 2.2 Write the stall alert in that step (3 minutes unchanged, "looks stalled, probably waiting for an approval", last tool call, where to open the transcript, no permission change); verify by reading the step against the "flags a stalled subagent" scenarios. result: read step 8 of `apply.md` against the "Transcript quiet for 3 minutes", "Transcript still changing" and "Permission rules untouched" scenarios -> each is covered by the step's text
- [x] 2.3 Dry-run the watch loop against a scratch transcript file in the session scratchpad (one file left untouched, one appended to) with a shortened threshold; verify it prints only for the untouched file and that the loop itself raises no permission prompt. result: watch loop at a 5 s threshold, plain foreground Bash -> untouched mock file printed `QUIET 5s: .../quiet.jsonl`, exit 0; mock file appended to every second printed nothing until `timeout 10` ended it, exit 124; no permission prompt for these plain Bash runs; `Monitor` itself untested

## 3. Checks and docs

- [x] 3.1 Add a test to `toolkit/tests/test_check_toolkit.py` or a sibling test file that the agent file carries the `rm -rf` hook and the command lists `Monitor`; verify with `cd toolkit; python -m pytest` passing. result: `cd toolkit; .venv/Scripts/python.exe -m pytest` -> 41 passed, including 4 new tests in `toolkit/tests/test_task_applier.py` for the `rm -rf` hook and `Monitor` in `allowed-tools`
- [x] 3.2 Mention the stall watch and the `rm -rf` block in `toolkit/README.md` where the agent and command are described; verify the text matches the updated files. result: checked by hand: `toolkit/README.md` "The task agent" and "What is enforced" now describe the 3-minute stall watch and the `rm -rf` block, and match `opsx-task-applier.md` v1.3.0 and `apply.md` step 8
- [x] 3.3 Run `openspec validate fix-stalled-subagents --strict` and `cd toolkit; python check_toolkit.py; python -m pytest`; verify all pass. result: `openspec validate fix-stalled-subagents --strict` -> "Change 'fix-stalled-subagents' is valid"; `cd toolkit; .venv/Scripts/python.exe check_toolkit.py` -> "toolkit check passed"; `.venv/Scripts/python.exe -m pytest` -> 41 passed

## Workflow follow-up

- Reinstall with `Install-Toolkit.ps1` and run one real `/jois-code:apply` to confirm the watch fires on a stalled subagent. Owner: the user, after the change is merged.
- Archive the change after review.
