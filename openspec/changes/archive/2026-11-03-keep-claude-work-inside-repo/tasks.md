# Tasks

## 1. New rule and ignore entry

- [x] 1.1 Create `toolkit/rules/jois-env-stay-in-repo.md` with `metadata` frontmatter (no `paths:`): `.scratch/` folder, git-ignored, cleanup, no reads or writes outside the project, no transcript reads, precedence over the harness scratchpad, tool temp folders pointed at `.scratch/`, per-worktree folder (result: no command; created `toolkit/rules/jois-env-stay-in-repo.md` with metadata frontmatter and no `paths:`, and covered each listed point by hand against the spec)
- [x] 1.2 Add the agent progress-note convention to the rule: write-capable agents append a line to `.scratch/agents/<agent>.log` after each step; read-only agents are waited for (result: no command; added the Subagents section on `.scratch/agents/<agent>.log` progress lines, with read-only agents waited for, checked by hand against the spec)
- [x] 1.3 Add `.scratch/` to the toolbox `.gitignore` (result: no command; added `.scratch/` to `.gitignore` after `.trees/`, checked by hand)

## 2. Edit the existing rules

- [x] 2.1 `toolkit/rules/jois-test-mock-data.md`: add the bullet for mock repos and data under `.scratch/` and verification through the project's `.venv` or `node_modules`; bump `last_updated` and `version` (result: edited `jois-test-mock-data.md`, added `.scratch/` and `.venv`/`node_modules` bullets, version 1.1.0, last_updated 2026-11-03; no command run, checked by hand against the spec)
- [x] 2.2 `toolkit/rules/jois-env-local-installs.md`: add that a missing environment is never a reason to stop or ask; keep the ask only for a tool with no local way; bump `last_updated` and `version` (result: edited `jois-env-local-installs.md`, added "A missing environment" section and narrowed the ask to tools with no local way, version 1.1.0, last_updated 2026-11-03; no command run, checked by hand against the spec)
- [x] 2.3 `toolkit/rules/jois-git-commit-hygiene.md`: add that a check which cannot run because the environment is missing is not a failure; set it up, run the checks; bump `last_updated` and `version` (result: edited `jois-git-commit-hygiene.md`, added the missing-environment-is-not-a-failure bullets, version 1.4.0, last_updated 2026-11-03; no command run, checked by hand against the spec)

## 3. Docs check and README

- [x] 3.1 Add `jois-env-stay-in-repo.md` to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` and extend its comment (result: `python -c ast.parse` on `check_toolkit.py` -> ok; added `jois-env-stay-in-repo.md` to `UNSCOPED_RULES` and extended its comment; `check_toolkit.py` not run)
- [x] 3.2 Add two tests in `toolkit/tests/test_check_toolkit.py` mirroring the mock-data rule's (accepted without `paths:`, rejected with `paths:`) (result: `python -c ast.parse` on `test_check_toolkit.py` -> ok; added the accepted-without-`paths:` test and the rejected-with-`paths:` test; pytest not run)
- [x] 3.3 Document the rule in `toolkit/README.md` (rule list, unscoped-rules section, the list at the line naming `jois-test-mock-data` and `jois-env-local-installs`) (result: no command; edited the README by hand in the unscoped-rules list, the "How the standards are split" list and the frontmatter sentence naming the unscoped rules; count changed to Five)

## 4. Verify

- [x] 4.1 Create `toolkit/.venv` (or the project's) per the installs rule and run `python check_toolkit.py` and `python -m pytest` from `toolkit/`; all pass (result: `.venv python -m venv toolkit/.venv` + `pip install -r requirements.txt` -> pytest 9.2.0 installed; `python check_toolkit.py` -> "toolkit check passed", exit 0; `python -m pytest <toolkit> --rootdir <toolkit> -p no:cacheprovider -q` -> 91 passed in 36.03s, exit 0; with `--basetemp` under git-ignored `.scratch/` one docs-checker test failed because git ignores the temp folder, so the passing run used pytest's default temp folder; run from the repo root with absolute paths and `--rootdir`, not from inside `toolkit/`)
- [x] 4.2 Run the installer with `-Scope project` into a folder under `.scratch/` and confirm `-List` shows the new rule `up to date` (result: `Install-Toolkit.ps1 -Scope project -Path .scratch/install-target -Rule jois-env-stay-in-repo.md` -> exit 0, installed; full install -> exit 0; `-Scope project -Path .scratch/install-target -List` -> exit 0, `rule jois-env-stay-in-repo.md up to date 1.0.0 (2026-11-03)`, all 22 items up to date)
- [x] 4.3 Run `openspec validate keep-claude-work-inside-repo` and fix what it reports (result: `openspec validate keep-claude-work-inside-repo` -> exit 0, "Change 'keep-claude-work-inside-repo' is valid", 1 warning: new requirement text over 500 characters, left as is)
