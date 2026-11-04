# Tasks

## 1. Checker fails when the publish workflow skips the builder

- [x] 1.1 Add the workflow check to `toolkit/skills/jois-init-docs-templates/scripts/check_docs.py`: read `.github/workflows/wiki-publish.yml`, pass when it is absent, else require a non-comment line naming `build_wiki.py` and `--out`. Verify the new tests in 1.2 pass. (result: test_check_docs.py with the check in place -> 17 passed on default temp)
- [x] 1.2 Add tests to `scripts/tests/test_check_docs.py`: the shipped template passes, a plain-`rsync` workflow fails naming the file, a comment-only mention fails, an absent workflow passes. Verify each test fails when the check is removed. (result: check call removed -> rsync and comment-only tests failed (2 failed, 15 passed); restored -> 17 passed)
- [x] 1.3 Update the header list of checks in `check_docs.py` (it says seven; the function composes six, so state the real count with the new one). Verify the list matches the checks in `check_docs()`. (result: header lists 8 checks (7 existing, 6 composed plus the name check, and the new workflow check); matched by hand against check_docs())
- [x] 1.4 Run the template tests and the toolkit check (`cd toolkit; python check_toolkit.py; python -m pytest`) and verify both pass. (result: python check_toolkit.py -> toolkit check passed; python -m pytest in toolkit/ -> 111 passed)

## 2. Command shows a diff before replacing a managed block

- [x] 2.1 In `toolkit/commands/jois-init/docs.md`, change the Markers rule so a block that differs from the template is shown as a diff and needs a yes before replacement, and a no leaves it. Verify the text matches the spec scenarios "Block edited by hand" and "Replacement declined". (result: manual comparison against scenarios "Block edited by hand" and "Replacement declined" -> Markers text matches both)
- [x] 2.2 Replace the ambiguous `wiki-publish=skipped` line in the report section with `skipped (declined)`. Verify no other place in `docs.md` uses the old wording. (result: grep `skipped` in docs.md -> old `wiki-publish=skipped` wording gone, now `skipped (declined)`)
- [x] 2.3 Bump `metadata.version` and `last_updated` in `docs.md`. Verify `python check_toolkit.py` still passes. (result: `python check_toolkit.py` -> "toolkit check passed"; version 1.1.0, last_updated 2026-11-04)

## 3. Stale claims about `.md` stripping

- [x] 3.1 Search `toolkit/` and `README.md` for statements that the publish step strips `.md`. Keep one only if a check enforces it. Verify the result in the change notes: the earlier search found only the builder docstring, which `test_out_rewrites_link_and_keeps_anchor` covers. (result: Grep of toolkit/ and README.md for strip/.md-rewrite claims -> only the builder docstring (build_wiki.py:11, :62) and the check_docs.py workflow check (:8, :17, :154, :162) claim it; all enforced by test_out_rewrites_link_and_keeps_anchor and the test_check_docs.py workflow tests (lines 129-149); no edit needed; tests not run)

## Workflow follow-up

- Repair `the-ledger` separately, in a session opened in that repo: it needs the builder, the template checker and the template workflow.
- Archive the change after review.
