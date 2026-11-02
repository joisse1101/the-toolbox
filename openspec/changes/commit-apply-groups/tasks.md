# Tasks

Each group is one concern and one commit. Run the toolkit checks through the project's `.venv` (`python check_toolkit.py`, `python -m pytest` from `toolkit/`) and install nothing outside the project.

## 1. Test runner agent

- [x] 1.1 Create `toolkit/agents/opsx-test-runner.md` with `model: haiku`, tools `Read, Grep, Glob, Bash`, `metadata.version: "1.0.0"` and `last_updated: "2026-11-02"`, reusing the applier's hook that refuses `git commit`, `git push`, `gh` and `rm -rf`. Verify with `python check_toolkit.py` from `toolkit/`, which reports no problem for the file. (result: python toolkit/check_toolkit.py (system Python, no .venv present) -> "toolkit check passed")
- [x] 1.2 Write the agent's body: run only commands the project's instructions name, choose suites by the files given, install nothing, and report per command the command line, exit code and counts line, plus the suites not run. Verify by reading the file against the "Test runner agent reports test results" requirement scenario by scenario. (result: read the file against the four scenarios of "Test runner agent reports test results" -> each is covered by a named section of the body; no command run)
- [x] 1.3 Run the toolkit test suite and verify `python -m pytest` from `toolkit/` passes with the new agent present. (result: toolkit/.venv/Scripts/python -m pytest -q -> "61 passed in 32.77s"; check_toolkit.py -> "toolkit check passed")

## 2. Commit-hygiene rule exception

- [x] 2.1 In `toolkit/rules/jois-git-commit-hygiene.md`, add the one exception that names `/jois-code:apply` on a branch other than `main` or `master` and points to the command for its conditions without restating them. Raise `metadata.version` to `1.3.0` and set `last_updated` to `2026-11-02`. Verify that the rule's other text is unchanged (`git diff` shows additions only) and `python check_toolkit.py` passes. (result: `git diff` -> additions only, plus the required version and date lines; `.venv/Scripts/python check_toolkit.py` -> "toolkit check passed"; `.venv/Scripts/python -m pytest -q` -> 61 passed)
- [x] 2.2 Verify the rule still lists `git add .`, `-A` and `-a` as forbidden and that no other command is named as an exception. (result: checked by hand in `toolkit/rules/jois-git-commit-hygiene.md`: "Never use `git add .`, `git add -A` or `git commit -a`" is still present; `/jois-code:apply` is the only command named as an exception)

## 3. Apply command

- [x] 3.1 In `toolkit/commands/jois-code/apply.md` front matter, add `Bash(git commit:*)` and `Bash(git branch --show-current:*)` to `allowed-tools`, keep `git push` out, update the `description`, raise `metadata.version` to `1.2.0`. Verify with `python check_toolkit.py`. (result: `.venv/Scripts/python check_toolkit.py` -> `toolkit check passed`; `apply.md` front matter checked by hand: both git entries added, no `git push`, description updated, version 1.2.0)
- [x] 3.2 Add to step 4 a check for `opsx-test-runner.md` in `~/.claude/agents/` and `.claude/agents/` that, when missing, names `Install-Toolkit.ps1` and falls back to the confirmation path instead of stopping. Verify against the "Test runner not installed" scenario. (result: step 4 read by hand against the "Test runner not installed" scenario: names `Install-Toolkit.ps1`, does not stop, step 10 falls back; `.venv/Scripts/python check_toolkit.py` -> `toolkit check passed`)
- [x] 3.3 Rewrite step 10 ("Stop for a commit"): read the branch, treat `main`, `master`, empty and unreadable as protected, dispatch `opsx-test-runner` with the group's changed files, judge by exit codes, check `git diff --stat` and `git status` for one concern and no foreign changes, then stage explicit paths, commit once with a `type(scope): subject` message, print the hash and message, and take the next group. Verify each fallback in design decision 4 appears once as a single fallback instruction and that `git push`, `-a`, `-A`, `--amend` and `--no-verify` are forbidden in the text. (result: step 10 read by hand against design decision 4: every fallback is one "fall back" bullet pointing to the single fallback, a hook rejection or other commit failure stops without falling back, `git push`, `-a`, `-A`, `--amend` and `--no-verify` are forbidden in the text; `.venv/Scripts/python check_toolkit.py` -> `toolkit check passed`)
- [x] 3.4 Extend step 8's stall watch to the test-runner dispatch. Verify the step names both agents. (result: step 8 read by hand: it names both `opsx-task-applier` and `opsx-test-runner`)
- [x] 3.5 Run `python check_toolkit.py` and `python -m pytest` from `toolkit/` and verify both pass. (result: `.venv/Scripts/python check_toolkit.py` -> `toolkit check passed`; `.venv/Scripts/python -m pytest` -> 61 passed in 19.35s)
## 4. Specs and docs

- [ ] 4.1 Run `openspec validate commit-apply-groups --strict` and verify it passes for both delta specs.
- [ ] 4.2 In `toolkit/README.md`, add the new agent to the list of agents and say that the rule and agent must be re-installed for the exception to take effect. Verify that the README's install command for the agent matches `Install-Toolkit.ps1 -Agent opsx-test-runner.md`.

## Workflow follow-up

- Sync the delta specs and archive the change after review (`/opsx:archive`).
- Re-run `Install-Toolkit.ps1` for the rule and the agent on each machine that uses them.
- Decide later whether `/jois-init:opsx` should reword the managed `operations.apply.guidance` line.
