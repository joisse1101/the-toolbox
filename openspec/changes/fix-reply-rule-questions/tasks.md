## 1. Rewrite the replies rule

- [x] 1.1 In `toolkit/rules/jois-comms-replies.md`, replace lines 15-17 with bullets that: act on a sensible default and say which was chosen; ask only when blocked on the user's decision; write one question as a plain sentence, not numbered; number only several independent questions; put alternatives inside one question; end with one clear next step when nothing is needed. Keep the line "Never leave a question the user must answer inside a paragraph". (result: edited the bullets by hand, no command run; the rule now has seven bullets covering default, ask only when blocked, one plain question, number only several, alternatives in one question, next step, and "Never leave a question..." kept)
- [x] 1.2 Bump `version` to `1.1.0` and `last_updated` to `2026-10-30` in the rule's frontmatter. (result: edited by hand, no command run; frontmatter now version "1.1.0", last_updated "2026-10-30")
- [x] 1.3 Check the rule body is still about 10 lines, one idea per bullet. (result: checked by hand, no command run; body is the intro line plus 12 bullets, one idea each, a little over 10 lines)

## 2. Verify

- [ ] 2.1 Run `cd toolkit; python check_toolkit.py; python -m pytest` and confirm they pass.
- [ ] 2.2 Run `openspec validate fix-reply-rule-questions` and confirm it passes.
