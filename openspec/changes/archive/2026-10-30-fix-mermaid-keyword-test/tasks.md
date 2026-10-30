# Tasks

## 1. Fix the keyword test

- [x] 1.1 Run `npm install` in `planner/` and verify `node --test --import ./test/setup.mjs test/claude/parse-mermaid.test.mjs` runs and fails only "a participant named after a Mermaid keyword is refused" (result: npm install -> exit 0; node --test --import ./test/setup.mjs test/claude/parse-mermaid.test.mjs -> 4 tests, 3 pass, 1 fail, only "a participant named after a Mermaid keyword is refused")
- [x] 1.2 In `planner/test/claude/parse-mermaid.test.mjs`, rename the participant `LINK` to `end` (keep the `«value object»<br/>ResetLink` label and the `A->>end: 1.1 x` message line) and assert `r.ok === false` and `r.line === 4`; verify the same command now passes all five tests (result: node --test --import ./test/setup.mjs test/claude/parse-mermaid.test.mjs -> 4 tests, 4 pass, 0 fail (the file has 4 tests, not 5))
- [x] 1.3 Check the test fails for the right reason: temporarily use `link` as the name and verify the test fails, then restore `end` and verify it passes again (result: node --test with `link` -> 4 tests, 3 pass, 1 fail (keyword test, true !== false); restored `end` -> 4 tests, 4 pass, 0 fail)

## 2. Correct the conventions

- [x] 2.1 In `planner/guidelines/diagram-conventions.md` (line 97), drop `LINK` from the refused names, name `END` and `NOTE` as examples, state that matching ignores case, and state that a reserved word is refused only once a message line uses it; verify `LINK` no longer appears in the file and the sentences follow the documents rule (one idea per bullet) (result: grep `LINK` in `planner/guidelines/diagram-conventions.md` -> 0 matches; the four new lines read by hand, one idea each)
- [x] 2.2 Run `npm test` from `planner/` and verify all tests pass, including the conventions-related ones (result: npm test -> 759 tests, 759 pass, 0 fail, after rebasing onto origin/main and re-checking out files as LF)

## Workflow follow-up

- Commit as one concern (`fix(test): ...`) after the commit-hygiene confirmation word.
- Archive the change with `/opsx:archive` once merged.
