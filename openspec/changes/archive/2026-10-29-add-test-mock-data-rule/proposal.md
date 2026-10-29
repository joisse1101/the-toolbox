## Why

Claude tends to verify its work against real data and real systems: it pushes to git to see what happens, or asks the user for real data to try something on. That touches real state, has outward-facing effects, and makes the user supply or expose real data. The core principles already say tests never touch real user state, but that covers test code, not Claude's own verification steps. See GitHub issue 25.

## What Changes

- Add `toolkit/rules/jois-test-mock-data.md`: test and verify against mock or fixture data and mock or stubbed systems by default; never push, publish, send, deploy or write to a real external system, or use real user data, credentials or state, to verify a change; build mock data from the codebase first (fixtures, sample data, schemas, types, models, existing tests); ask the user only for mock data or the data's shape, never real data; allow real data or systems only when the user asks for them in the current request, with no carry-over from earlier approval.
- The rule has no `paths:` frontmatter, so it loads in every session. This departs from the issue's wording (`paths`): verification such as `git push`, a deploy or asking the user for data touches no code file, and a scoped rule is not loaded until a matching file is read (the reason `jois-git-commit-hygiene` is unscoped).
- `check_toolkit.py` lists the rule in `UNSCOPED_RULES` so the check accepts it without `paths:` and rejects it with `paths:`.
- README lists the rule and names it as the second unscoped rule.
- The installer needs no change: it copies everything in `toolkit/rules/`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `toolkit-coding-standards`: a new requirement for the `jois-test-mock-data` rule, loaded in every session, with its content and the docs-check behavior for an unscoped rule.

## Impact

- `toolkit/rules/jois-test-mock-data.md` (new), `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`, `toolkit/README.md`.
- Costs a short block of context in every session that installs the toolkit rules.
- Closes GitHub issue 25.
