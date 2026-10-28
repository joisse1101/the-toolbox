## Context

See proposal.md - Why. `CODE_EXTENSIONS` in `check_toolkit.py` is the allowed set, and each of the three code-scoped rules repeats its own `paths:` list in its frontmatter. Today the checker only requires every glob to be inside the set, so one rule can list fewer types than another without a failure. The technology rules (TypeScript/React, Java, Python, config, scripts) are scoped separately and are not part of this change.

## Goals / Non-Goals

**Goals:** the core standards load for the languages the user writes, web files included; the three rules cannot drift apart; adding a language is one visible edit.

**Non-Goals:** removing `paths:` (sessions without code would pay the context cost); changing any rule's content; changing technology-rule scopes; making the set configurable at install time.

## Decisions

- **Keep path scoping and widen the list.** Unscoped loading was considered and rejected: it costs context in every session, including ones that never touch code. A longer glob list costs nothing now that size budgets are gone.
- **One set, defined in `check_toolkit.py`.** `CODE_EXTENSIONS` becomes the full list, and the check changes from "every glob is in the set" to "the globs equal the set" for each of the three rules. That makes the three rules identical and makes a new language a change to the constant plus the three frontmatters, which the check forces to stay in step. Alternatives were a looser subset check (lets the rules drift) and generating the frontmatter from the constant at install time (adds a build step to a copy-only installer).
- **One glob per line, `**/*.<ext>`.** The checker reads one extension per glob, so brace expansion (`**/*.{py,go}`) is not used.
- **The list is the one agreed with the user:** the original nine plus `html`, `css`, `scss`, `vue`, `svelte`, `go`, `rs`, `cs`, `kt`, `rb`, `php`, `c`, `h`, `cpp`, `swift`, `sql`.
- **Overlap with the TypeScript/React rule is allowed.** It scopes `css` and `html` too. The code-scoped rules are already exempt from the one-rule-per-extension check, so nothing changes there.
- **Bump `metadata.version` to the next minor (1.1.0 -> 1.2.0 for core-principles and architecture-boundaries, 1.0.0 -> 1.1.0 for quality) and `last_updated` to the date of the edit.** Only the frontmatter changes, but the scope of a rule is part of its behavior.

## Risks / Trade-offs

- [A rule never loads for an unlisted language] -> Accepted; the check error names the constant to extend, and the user chose a list over unscoped loading.
- [The stricter equality check makes adding a type a four-place edit] -> Intended: the check reports exactly which rule is missing it.
- [A scoped rule is still absent before any matching file is opened] -> Unchanged and already documented in the README.
- [Already installed copies keep the old scope] -> Reinstall; `-List` shows the three rules as `differs`.

## Migration Plan

Reinstall the toolkit (`Install-Toolkit.ps1 -Force`, or delete the three rules and install) to pick up the new `paths:`. Rollback is `git revert` of the change's commits.
