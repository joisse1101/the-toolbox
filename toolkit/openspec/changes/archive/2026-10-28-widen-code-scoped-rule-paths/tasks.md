## 1. Widen the scope (one commit)

- [x] 1.1 In `check_toolkit.py` set `CODE_EXTENSIONS` to the full list (the original nine plus `html`, `css`, `scss`, `vue`, `svelte`, `go`, `rs`, `cs`, `kt`, `rb`, `php`, `c`, `h`, `cpp`, `swift`, `sql`), change `_check_code_scoped_rules` so each of the three rules must declare exactly that set (naming the rule and the missing or extra type), and update the comment above the constant
- [x] 1.2 Replace the `paths:` list in `rules/jois-code-core-principles.md`, `rules/jois-code-architecture-boundaries.md` and `rules/jois-code-quality.md` with one `"**/*.<ext>"` line per type in the same order, and bump `metadata.version` (core-principles and architecture-boundaries to 1.2.0, quality to 1.1.0) and `last_updated`
- [x] 1.3 In `tests/test_check_toolkit.py` make the code-scoped fixtures declare the full set (a helper that builds it), and add cases that a rule missing one type fails, a rule with an extra source-code type fails, and a non-source glob still fails; verify `python -m pytest` and `python check_toolkit.py` pass
- [x] 1.4 Run `grep -rn "\"\*\*/\*.bat\"\|\`bat\`" toolkit --include=*.md --include=*.py` and update any README or installer text that still lists the nine types, and verify nothing else names them

## 2. Verify and archive

- [x] 2.1 Reinstall into a temp project with `Install-Toolkit.ps1 -Scope project -Path <temp>` and verify `-List` shows every item `up to date` and the three rules carry the new `paths:`
- [x] 2.2 After reinstalling globally, open an `.html` or `.css` file in a new Claude Code session and verify `jois-code-quality` is loaded
- [x] 2.3 Run `openspec validate widen-code-scoped-rule-paths --strict`, check that no `wiki/` page needs an update (the repo has none), then archive the change
