# Tasks

## 1. Confirm the settings route

- [x] 1.1 Write a mock settings file under `.scratch/` whose `env` block sets `CLAUDE_CODE_SUBAGENT_MODEL` to `sonnet`, run one headless session with `claude -p --model opus --settings <that file>` that starts a `general-purpose` subagent with no model and asks it for its model name, and verify the subagent reports Sonnet. If it does not, stop and tell the user, because the installer step would not work. Remove the `.scratch/` files afterwards.

## 2. Rule, worker agent and model pins

- [x] 2.1 Write `toolkit/rules/jois-env-subagents.md` with no `paths:`, `metadata.version` and `metadata.last_updated`, following the "Subagents run on Sonnet or Haiku", "Headless sessions are narrowed and pinned" and "Ordinary delegated work goes to the worker agent" requirements, including the model-order sentence. Verify by reading it against those three requirements and by checking it is short, because it loads on every turn.
- [x] 2.2 Add a pointer to `jois-env-subagents` in the Subagents section of `toolkit/rules/jois-env-stay-in-repo.md` and bump its `metadata.version` and `last_updated`. Verify the `.scratch/agents/` logging line is still there.
- [x] 2.3 Write `toolkit/agents/jois-worker.md`: `model: sonnet`, tools `Read, Grep, Glob, Edit, Write, Bash`, a `maxTurns`, the same `PreToolUse` commit-and-push guard as `opsx-task-applier`, and `metadata`. Verify its frontmatter has no `Skill` tool and its body does not drop the user's rules.
- [x] 2.4 Add `model: sonnet` to `toolkit/agents/opsx-task-applier.md` and `toolkit/agents/code-validator.md` and bump their `metadata.version` and `last_updated`. Verify `opsx-test-runner.md` still says `model: haiku` and is unchanged.
- [x] 2.5 Add `jois-env-subagents.md` to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` and add a test in `toolkit/tests/test_check_toolkit.py` that a `paths:` line in that rule fails the check. Verify the new test sits beside the existing unscoped-rule tests.
- [x] 2.6 Update `wiki/toolkit/Rules.md`, `wiki/toolkit/Toolkit-Guide.md` and `toolkit/README.md` for the new rule and agent. Recount rules, unscoped rules and agents from a listing of `toolkit/rules/` and `toolkit/agents/`, not from the old numbers, since the guide's agent count is already stale. Verify each count against `ls`.

## 3. Installer default-model setting

- [x] 3.1 Add a `settings` entry to `toolkit/install/targets.json` (`~/.claude/settings.json` globally, `.claude/settings.json` per project) and make `Resolve-DestRoot` or a sibling read it. Verify with `-List` against a mock home that the path resolves for both scopes.
- [x] 3.2 In `toolkit/install/Install-Toolkit.ps1`, add the settings step after the item loop, on a full install only: create the file or `env` object when missing, keep every other key, skip the write when the value is already `sonnet`, never touch `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, save a backup beside an existing file before writing, and leave an invalid-JSON file unchanged with a non-zero exit. Verify with the scenarios of "Installer sets the default subagent model" and "Installer protects the settings file" run against mock files under `.scratch/`.
- [x] 3.3 Add the conflict path: when the key holds another value, print the current value, both effects and a question, act on the answer, and add `-SubagentModel Overwrite|Skip` and `-NoSettings`. With no person at the console, skip and print a warning. Verify with the scenarios of "Installer asks before replacing a different value".
- [x] 3.4 Make `-List` print the key's state and make `-Uninstall` leave `settings.json` unchanged and print the key to remove by hand. Update the script's help text, which now says settings are never touched. Verify with the scenarios of "Listing and uninstall cover the setting".
- [x] 3.5 Add `toolkit/tests/test_install_settings.py`, following `toolkit/tests/test_install_packages.py`, with one test per scenario of the two installer requirements above, on mock settings files and a mock home under `.scratch/`, plus fixtures with a nested `permissions` array and a nested `hooks` object that must come back unchanged. Verify every scenario name has a test.
- [x] 3.6 Update `wiki/toolkit/Install.md` and the manual-install section of `toolkit/README.md`: the new step, the two parameters, what overwriting and skipping each do, the file reformatting and the backup, and why only the default variable is set. Verify the page names every parameter the script defines.

## 4. Whole-change checks

- [x] 4.1 Run the project's own test commands for the whole change and complete any fixes the failures need. Verify with `cd toolkit; python check_toolkit.py; python -m pytest` (exit code 0 for each), `python scripts/check_docs.py` (exit code 0) and `openspec validate pin-subagent-model --strict`, and report the counts line of each.

## Workflow follow-up

- After the change is applied, delete the memory note `subagents-use-sonnet` (owner: the user), because the shipped rule replaces it.
- Archive the change with `/opsx:archive` once the checks pass (owner: the user).
