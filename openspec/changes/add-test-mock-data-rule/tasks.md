## 1. Rule and check

- [x] 1.1 Add `toolkit/rules/jois-test-mock-data.md` (`metadata` block only, version `1.0.0`, `last_updated` `2026-10-29`, short bullets covering every scenario of the spec) and verify it links to `jois-code-core-principles` without restating it
- [x] 1.2 Add `jois-test-mock-data.md` to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` and update the comment above it; verify `python check_toolkit.py` from `toolkit/` passes
- [x] 1.3 Add tests in `toolkit/tests/test_check_toolkit.py` that the new rule is accepted without `paths:` and rejected with `paths:`; verify `python -m pytest` passes

## 2. Docs and delivery

- [x] 2.1 Update `toolkit/README.md`: add the rule to the rules list and the unscoped-rule wording (two unscoped rules, not one); verify no remaining text says commit hygiene is the only unscoped rule
- [x] 2.2 Verify the installer delivers the rule with the toolkit's installer in a temporary install folder (`-Scope project -Path <temp folder>`) and `-List` shows it `up to date`
