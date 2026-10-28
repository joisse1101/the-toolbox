## Context

See proposal.md - Why. Today `skills/jois-code-standards/SKILL.md` is a review checklist, and `check_toolkit.py` enforces byte budgets on every rule and on the skill. The skill folder also holds `scripts/Get-ItemHash.ps1`, which `install/Install-Toolkit.ps1` (line 96) and the README call. It is the toolkit's only skill, so removing it leaves `toolkit/skills/` empty. The installer already treats a missing skills folder as "no skills" (`Test-Path` at line 118).

## Goals / Non-Goals

**Goals:** standards load automatically while code is written; rules are written in readable prose; the installer and checker keep working with no skills.

**Non-Goals:** rewriting the existing compact rules (a follow-up, so this change stays reviewable); changing `jois-code-architecture-boundaries` or the technology rules' content; adding a replacement review skill.

## Decisions

- **A separate `jois-code-quality` rule, not a merge into core-principles.** About half of the skill's smells restate core-principles (DRY, YAGNI, swallowed errors, descriptive names, one job per function), so those are dropped and linked. What remains (dead code, nesting, constants, ternaries and one-liners, comments, testing, "Prefer") is a different layer: concrete smells and test conventions, not principles. Core-principles holds rules only, and testing structure and "Prefer" do not fit there. Loading cost is the same either way because both use the same `paths:`. Merging was rejected for that reason; architecture-boundaries has no overlap.
- **Remove all size budgets rather than raise them.** A higher number would only delay the same squeeze. The budgets' purpose was context cost, but unreadable rules are followed less reliably. The check keeps what is structural: code-scoped `paths:` for the core rules, `paths:` on technology rules, one technology rule per extension, the unscoped commit rule.
- **The core rules join one `CODE_SCOPED_RULES` list** (core-principles, architecture-boundaries, quality) in `check_toolkit.py` in place of `ALWAYS_ON_RULES`. They must be code-scoped and are skipped by the extension-uniqueness check, which would otherwise flag every language they share.
- **`Get-ItemHash.ps1` moves to `install/`.** It serves the installer, not a skill, and the skill folder is going away. `install/targets.json` already sits there. The helper stays self-contained, so copying a skill by hand still needs nothing else.
- **The skill-reference check is dropped, not ported.** `_check_review_skill` verified backticked references inside the skill. The new rule links to core-principles with a relative markdown link as the Python rule does; extending the reference check to rules was already noted in the earlier rename design and is not needed here.
- **Keep the `toolkit-skills` capability.** Skills, the installer's skill handling and the hand-copy layout remain supported; the toolkit just ships none for now.

## Risks / Trade-offs

- [Users who installed the skill keep a stale copy in `~/.claude/skills`] -> README migration note: delete `jois-code-standards` from the skills folder, then reinstall.
- [Without budgets the always-loaded rules can grow and cost context in every code session] -> Accepted by the user; review rule length in normal review instead of by a byte count.
- [An empty `skills/` folder trips the installer or checker] -> Task verifies both with the folder removed; the code already guards the missing folder.
- [Losing the on-demand review checklist] -> `code-review` and `simplify` cover review; the standards live in the rule the reviewer also reads when code is touched.

## Migration Plan

Reinstall the toolkit to add `rules/jois-code-quality.md`, and delete `~/.claude/skills/jois-code-standards` (or `<project>/.claude/skills/jois-code-standards`). Rollback is `git revert` of the change's commits.
