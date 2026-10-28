---
metadata:
  version: "1.1.0"
  last_updated: "2026-10-28"
paths:
  - "**/*.py"
  - "**/*.java"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.ps1"
  - "**/*.sh"
  - "**/*.bat"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.cs"
  - "**/*.kt"
  - "**/*.rb"
  - "**/*.php"
  - "**/*.c"
  - "**/*.h"
  - "**/*.cpp"
  - "**/*.swift"
  - "**/*.sql"
---
# Code quality

Concrete smells to avoid and a testing structure to follow while writing code. Principles such as
DRY, YAGNI, error handling, descriptive names and one job per function are in
[jois-code-core-principles](jois-code-core-principles.md); this rule does not repeat them.

## Code

- Delete dead code: unused functions, imports, branches and parameters. Never leave code commented
  out; version control keeps the history.
- Keep nesting to about two levels. Past that, use early returns or extract a function.
- Give an unexplained number or string a named constant, so the reader sees what it means and
  there is one place to change it.
- Never nest a ternary (a conditional expression inside another). Use `if` statements or a named
  helper.
- Split a dense one-liner that the reader must decode, such as a long chain or a compound
  expression, into named steps.
- A comment explains why: the reason for a non-obvious choice, a constraint or a workaround. It
  never restates what the line does; delete it or improve the name instead.

## Tests

- Each test covers one behavior and follows arrange, act, assert.
- A test name says what happens and when (`returns empty list when no match`), not `works`.
- Test behavior through the public interface, not private details.
- Keep one test file per module, placed where the project's convention puts it.
- A bug fix comes with a test that fails without the fix.

## Prefer

- Match the surrounding code's naming, layout and idiom over personal taste.
- Name things for what they are: nouns for values, verb-noun for functions, `is` or `has` for
  booleans.
- Document a public API by its contract (inputs, outputs, errors) and no more.
