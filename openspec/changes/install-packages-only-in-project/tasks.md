## 1. Rule and check

- [x] 1.1 Add `toolkit/rules/jois-env-local-installs.md` (`metadata` block only, version `1.0.0`, `last_updated` `2026-10-31`, short bullets covering every scenario of the spec: the inside-the-project test, the `.venv` steps, run-through-the-venv, no global installs, per-worktree environments, ask when no local way exists, `npx`-style one-offs); verify it does not restate `jois-code-python` (result: rule file written by hand; checked each spec scenario and `jois-code-python` overlap by reading, no command)
- [x] 1.2 Add `jois-env-local-installs.md` to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` and update the comment above it; verify `python check_toolkit.py` from `toolkit/` passes (result: `python check_toolkit.py` from `toolkit/` -> "toolkit check passed", exit 0)
- [x] 1.3 Add tests in `toolkit/tests/test_check_toolkit.py` that the new rule is accepted without `paths:` and rejected with `paths:`; verify `python -m pytest` passes, run through a `.venv` created for the worktree (per the new rule) (result: `.venv/Scripts/python.exe -m pytest -q` from `toolkit/` (venv created in the worktree, pytest installed there only) -> 37 passed; `git status --short` shows no `.venv` untracked files)

## 2. Docs and delivery

- [ ] 2.1 Update `toolkit/README.md`: add the rule to the rules list and to the "why unscoped" and install-summary wording (three unscoped rules besides the replies rule's entry, as the README currently counts them); verify no remaining text gives a stale count of unscoped rules
- [ ] 2.2 Check the README's existing `.venv` section still agrees with the rule
- [ ] 2.3 Verify the installer delivers the rule with the toolkit's installer in a temporary install folder (`-Scope project -Path <temp folder>`) and `-List` shows it `up to date`
