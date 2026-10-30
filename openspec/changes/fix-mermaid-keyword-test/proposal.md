# Proposal

## Why

The test "a participant named after a Mermaid keyword is refused" fails on `main` (issue #52). It names a participant `LINK`, and Mermaid 12.2.0 accepts that name, so the parser is right and the test is wrong. The same mistake sits in `diagram-conventions.md`, which lists `LINK` as a refused name.

## What Changes

- Test: use the participant name `end` instead of `LINK`, and assert that the refusal points at the message line that uses the name (line 4).
- Conventions: remove `LINK` from the list of refused names in `planner/guidelines/diagram-conventions.md`, keep `END` and `NOTE`, and state that matching ignores case.
- Conventions: state that a reserved word is refused only once a message line uses it, because `participant end` on its own parses.

Known (probed on Mermaid 12.2.0):
- `link` and `LINK` are accepted.
- `NOTE`, `END`, `LOOP`, `ALT`, `OPT`, `RECT`, `ACTOR`, `PARTICIPANT`, `title`, `activate` and `autonumber` are refused, in either case.
- A refused name fails with `Parse error on line 4`, the message line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `diagram-conventions` requirement "Mermaid diagram content rules" already says every `mermaid` block must be valid Mermaid as Mermaid's own parser judges. It names no reserved words, so no requirement changes. The change sets `skip_specs: true`.

## Impact

- `planner/test/claude/parse-mermaid.test.mjs`: one test input and its assertions.
- `planner/guidelines/diagram-conventions.md`: line 97 and one added sentence.
- No change to `parse-mermaid.mjs` or any runtime code.
- Out of scope: a check that rejects reserved participant names before Mermaid's parser sees them.
