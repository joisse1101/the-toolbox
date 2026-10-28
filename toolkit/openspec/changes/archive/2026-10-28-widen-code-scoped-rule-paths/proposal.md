## Why

The three code-scoped rules (`jois-code-core-principles`, `jois-code-architecture-boundaries`, `jois-code-quality`) load only for nine file types: `py`, `java`, `ts`, `tsx`, `js`, `jsx`, `ps1`, `sh`, `bat`. A session that touches only HTML or CSS, or code in Go, Rust, C# and similar languages, loads none of them, so the standards are missing exactly where code is being written. The scoping is still wanted, so that sessions that never touch code (tickets, workflows) stay clean; the list just has to cover the languages in use.

## What Changes

- Widen the source-code file types for the three rules to add `html`, `css`, `scss`, `vue`, `svelte`, `go`, `rs`, `cs`, `kt`, `rb`, `php`, `c`, `h`, `cpp`, `swift` and `sql` to the existing nine.
- Define the list once in `check_toolkit.py` (`CODE_EXTENSIONS`) and make the checker require that all three rules declare exactly that set, so the rules cannot drift apart and adding a language is one visible edit.
- Update the `paths:` frontmatter of the three rules and bump their `metadata.version` and `last_updated`.
- Update the "Core floor is code-scoped" requirement and its scenarios.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-coding-standards`: the "Core floor is code-scoped" requirement lists the wider set of file types and requires the three rules to share one scope.

## Impact

- `toolkit/rules/jois-code-core-principles.md`, `jois-code-architecture-boundaries.md`, `jois-code-quality.md` (frontmatter and version only), `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`.
- No installer or README change is expected beyond a check that no text still lists the nine types.
- Users reinstall to pick up the new `paths:`; until then the installed rules keep the old scope.
- The rules now also load for `html`/`css`/`scss`/`vue`/`svelte` files, which the TypeScript/React technology rule already scopes for `css` and `html`. The code-scoped rules are exempt from the one-rule-per-extension check, so the overlap is allowed.
