## 1. Rules (PR `docs/retrofit-rules`, based on `feat/comms-rules`)

- [x] 1.1 Rewrite `jois-code-architecture-boundaries.md`, `jois-code-config-files.md` and `jois-code-core-principles.md` to follow the documents rule, bump their version and date, and verify `python check_toolkit.py` passes
- [x] 1.2 Rewrite `jois-code-java.md`, `jois-code-python.md`, `jois-code-quality.md`, `jois-code-scripts.md` and `jois-code-typescript-react.md` the same way and verify `python check_toolkit.py` passes
- [x] 1.3 Rewrite `jois-git-commit-hygiene.md` the same way, keep the confirmation-word and one-concern rules unchanged in meaning, and verify `python check_toolkit.py` and `python -m pytest` pass from `toolkit/`
- [x] 1.4 Compare each rule with its old text (`git diff`) and verify no normative rule, path scope or limit changed

## 2. Commands (PR `docs/retrofit-commands`, based on `docs/retrofit-rules`)

- [x] 2.1 Rewrite `commands/jois-git/stage.md` and `commands/jois-init/opsx.md`, bump version and date, and verify `python check_toolkit.py` passes
- [x] 2.2 Rewrite `commands/jois-git/write-issue.md` and verify every step, hard stop and confirmation word is still present
- [x] 2.3 Rewrite `commands/jois-git/write-pr.md` and `commands/jois-git/update-pr.md`, and verify the Never list, the end-turn steps and the no-merge rule are unchanged in meaning (result: python check_toolkit.py -> toolkit check passed; python -m pytest -q -> 33 passed; Never list, end-turn steps and no-merge rule compared by hand against the old text, unchanged in meaning)
- [x] 2.4 Check the size of the PR with `git diff --numstat`, split it by file into a further stacked PR if it passes about 400 changed lines, and verify `python -m pytest` passes from `toolkit/` (result: git diff --numstat -> 277/164 update-pr.md and 330/196 write-pr.md, about 801 changed lines, over the 400 limit; user chose one PR, accepted over the limit; python -m pytest -q from toolkit/ -> 33 passed)

## 3. Agent and README (PR `docs/retrofit-agent-readme`, based on `docs/retrofit-commands`)

- [x] 3.1 Rewrite `agents/opsx-task-applier.md`, bump version and date, and verify its never-commit, never-push and never-edit-tasks limits are unchanged (result: git diff compared by hand -> never-commit, never-push, never-edit-tasks lines and both hooks unchanged, frontmatter tools and maxTurns unchanged; version 1.2.1 -> 1.2.2, last_updated 2026-10-30)
- [x] 3.2 Rewrite `toolkit/README.md` to follow the documents rule, match the final wording of the rules and commands, and verify `python check_toolkit.py` and `python -m pytest` pass from `toolkit/` (result: python check_toolkit.py -> toolkit check passed; python -m pytest -> 33 passed in 1.07s)

## 4. Stack

- [x] 4.1 Open each PR with `/jois-git:write-pr`, based on the previous branch, and verify the merge order and the rebase steps are in the final summary (result: opened #46 on main and #47 on docs/retrofit-pr-commands; merge order and rebase steps were in the final summary; #46 merged, #47 rebased onto main and retargeted)
