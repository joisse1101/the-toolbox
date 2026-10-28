## Why

`jois-code-standards` is a review checklist skill ("not needed while writing code"), but the toolkit's coding standards should be universal guidance Claude has loaded while it writes code. A skill loads only on demand; a path-scoped rule loads automatically when code is touched. Separately, the rule size budgets (2 KB core, 4 KB core pair, 3 KB technology, 2 KB commit rule, 4 KB skill) have squeezed the rules into compact, hard-to-read text, so clarity now matters more than brevity.

## What Changes

- Add a `jois-code-quality` rule, scoped to source-code file types, holding only the standards that `jois-code-core-principles` lacks: dead code, nesting depth, named constants, nested ternaries and dense one-liners, comments that explain why, testing structure, and a final "Prefer" section. It links to core-principles instead of restating DRY, YAGNI, swallowed errors, descriptive names and one job per function.
- **BREAKING**: remove the `jois-code-standards` skill. The built-in `code-review` and `simplify` skills cover review.
- Move `Get-ItemHash.ps1`, used by the installer and the README, from `skills/jois-code-standards/scripts/` to `install/`, so the installer keeps working.
- Remove every size budget from `check_toolkit.py`, its tests and the spec. Rules favor clarity over brevity. Existing rules are not rewritten here.
- Replace the review-skill check in `check_toolkit.py` with a check that the new rule is code-scoped. Its extensions may overlap technology rules on purpose.
- Update the README and installer examples that name the skill or the budgets.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-coding-standards`: the review skill layer becomes a `jois-code-quality` rule; the size-budget requirements and scenarios are removed; readability-smell scenarios point to the rule.
- `toolkit-skills`: `jois-code-standards` is no longer a skill, so the "Skill stays discoverable" scenario and the mention in the command-flag requirement go.

## Impact

- `toolkit/rules/` (new rule), `toolkit/skills/jois-code-standards/` (removed), `toolkit/install/` (helper moved, `Install-Toolkit.ps1` path and examples), `toolkit/check_toolkit.py` and `toolkit/tests/test_check_toolkit.py`, `toolkit/README.md`.
- Users who installed the skill: reinstalling adds the rule; the old skill folder in `~/.claude/skills` stays until removed by hand.
