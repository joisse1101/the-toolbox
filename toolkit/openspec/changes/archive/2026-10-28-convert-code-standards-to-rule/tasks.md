## 1. Remove the size budgets (one commit)

- [x] 1.1 In `check_toolkit.py` delete `CORE_RULE_BUDGET_BYTES`, `ALWAYS_ON_BUDGET_BYTES`, `SCOPED_RULE_BUDGET_BYTES`, `SKILL_BUDGET_BYTES`, `UNSCOPED_RULE_BUDGET_BYTES` and every size check that uses them, update the module docstring, and verify `grep -n "BUDGET\|bytes" toolkit/check_toolkit.py` finds nothing
- [x] 1.2 In `tests/test_check_toolkit.py` remove the over-budget cases (core, always-on total, scoped, unscoped, skill size) and add one test that a large rule produces no size problem, and verify `python -m pytest` passes
- [x] 1.3 In `toolkit/README.md` remove the "capped at 2 KB" sentence and the "size budgets" wording under Checks, and verify `grep -n "KB\|budget" toolkit/README.md` finds nothing

## 2. Move the hash helper (one commit)

- [x] 2.1 `git mv toolkit/skills/jois-code-standards/scripts/Get-ItemHash.ps1 toolkit/install/Get-ItemHash.ps1`, point `install/Install-Toolkit.ps1` (line 96 and the comment at line 18) and the README (lines ~187-192) at the new path, and verify `.\Install-Toolkit.ps1 -List` runs against a temp `-Scope project -Path` without error

## 3. Convert the skill into a rule (one commit)

- [x] 3.1 Create `toolkit/rules/jois-code-quality.md` with `metadata` (version `1.0.0`, today's date) and the same code-only `paths:` as `jois-code-core-principles`; write in clear prose, rules first (dead code, nesting depth, named constants, no nested ternaries or decoding-heavy one-liners, comments that explain why, testing structure), link to `jois-code-core-principles` for DRY, YAGNI, error handling and naming, end with a `## Prefer` section; verify no line restates a core-principles rule
- [x] 3.2 `git rm -r toolkit/skills/jois-code-standards` and verify `toolkit/skills/` is gone or empty and `.\Install-Toolkit.ps1 -List` still runs
- [x] 3.3 In `check_toolkit.py` replace `ALWAYS_ON_RULES` with `CODE_SCOPED_RULES` including `jois-code-quality.md`, delete `_check_review_skill`, keep the code-only `paths:` check, and skip these rules in the extension-uniqueness check; update the docstring
- [x] 3.4 Update `tests/test_check_toolkit.py`: drop the `skills/jois-code-standards` fixture and skill-reference test, add the quality rule to `_toolkit_tree`, add cases for a missing quality rule, one without `paths:`, and one with a non-code glob, and verify `python -m pytest` and `python check_toolkit.py` pass
- [x] 3.5 In `toolkit/README.md` and `install/Install-Toolkit.ps1` replace the skill mentions (install example, bundle table row, "on-demand review skill", frontmatter example, hand-copy example) with the rule or another existing item, add the migration note from design.md, and verify `grep -rn "jois-code-standards" toolkit --include=*.md --include=*.ps1 --include=*.py` finds nothing outside `openspec/changes/archive/`

## 4. Verify end to end

- [x] 4.1 Install into a temp project with `Install-Toolkit.ps1 -Scope project -Path <temp>` and verify `rules/jois-code-quality.md` lands, no `skills/` folder is required, and `-List` shows every item `up to date`; then `-Uninstall` and verify the toolkit's items are gone
- [x] 4.2 In a new Claude Code session in the temp project, open a `.py` file and verify `jois-code-quality` is loaded (shown by `/context` or the memory listing)

## 5. Specs and archive

- [x] 5.1 Run `openspec validate convert-code-standards-to-rule --strict` and verify it reports the change valid
- [x] 5.2 Check whether a `wiki/` page describes the coding standards or the skill (the repo root has none beside `toolkit/`), update it if one exists, then archive the change
