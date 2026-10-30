---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
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

Concrete smells to avoid and a testing structure to follow. Principles such as DRY, YAGNI, error handling, descriptive names and one job per function are in [jois-code-core-principles](jois-code-core-principles.md); this rule does not repeat them.

## Code

- Delete dead code: unused functions, imports, branches and parameters.
- Never leave code commented out; version control keeps the history.
- Keep nesting to about two levels.
- Past two levels, use early returns or extract a function.
- Give an unexplained number or string a named constant.
- A named constant shows what the value means and gives one place to change it.
- Never nest a ternary, which is a conditional expression inside another.
- Use `if` statements or a named helper instead.
- Split a dense one-liner into named steps.
- A dense one-liner is one the reader must decode, such as a long chain or a compound expression.
- Write a comment to explain why: the reason for a non-obvious choice, a constraint or a workaround.
- Never write a comment that restates what the line does.
- Delete such a comment or improve the name instead.

## Tests

- Each test covers one behavior and follows arrange, act, assert: set up, run, then check.
- A test name says what happens and when, such as `returns empty list when no match`, not `works`.
- Test behavior through the public interface, not private details.
- Keep one test file per module, placed where the project's convention puts it.
- A bug fix comes with a test that fails without the fix.

## Prefer

- Match the surrounding code's naming, layout and idiom over personal taste.
- Name values with nouns, functions with verb-noun, and booleans with `is` or `has`.
- Document a public API by its contract: inputs, outputs and errors.
- Document no more than the contract.
