# Design

This design was written after the change was applied. It records the approach as built, not as planned.

## Context

- The change edits one rule file: `toolkit/rules/jois-comms-replies.md`. See proposal.md - Why.
- A rule is plain markdown that Claude reads at the start of a session. There is no code to run.
- The old rule ended every reply with a numbered list of full questions.
- The rule body was 8 bullets before the change.
- Installed copies, such as `~/.claude/rules/jois-comms-replies.md`, do not change until the toolkit is reinstalled.

## Goals / Non-Goals

**Goals:**
- Make Claude act on a default before it asks.
- Make a lone question read as a plain sentence.
- Keep numbering for replies that hold several independent questions.

**Non-Goals:**
- Capping the number of options or questions. The spec forbids a cap.
- Changing any other bullet of the rule.
- Reinstalling the rule on the user's machine.

## Decisions

### Replace lines 15-17 and keep the rest

- Only the question and ending bullets change.
- The first five bullets (answer first, short paragraphs, plain words, coined names, standalone reader) stay as they were.
- Alternative considered: rewrite the whole rule. Rejected because the issue is only about how replies end.

### One bullet per idea

- The six required ideas became six bullets, and "Never leave a question the user must answer inside a paragraph" stays as the seventh.
- Alternative considered: merge ideas into fewer bullets to stay near 10 lines. Rejected because the user's documents rule asks for one idea per bullet.

### Defaults first, questions second

- The default bullet comes before the "ask only when blocked" bullet.
- This makes acting on a default the first choice and asking the exception.
- Alternative considered: keep asking as the base case and add "unless a default exists". Rejected because it would keep the habit the issue describes.

### Alternatives stay inside one question

- Options for one decision go in a single question, not in separate numbered questions.
- This stops one decision from looking like several.

### Version bump

- `version` goes from `1.0.0` to `1.1.0` and `last_updated` to `2026-10-30`.
- A minor bump fits because the behavior changes but the rule keeps its shape.

## Risks / Trade-offs

- **Known:** the body is now the intro line plus 12 bullets, a little over the "about 10 lines" in task 1.3. Mitigation: each bullet is one short idea, and the spec has no line limit.
- **Assumed:** Claude will tell a decision that is the user's to make apart from one with a sensible default. Mitigation: none in the rule text. Watch real replies and tighten the wording if it asks too much or too little.
- **Known:** installed copies keep the old rule until a reinstall. Mitigation: the user reinstalls with `Install-Toolkit.ps1` when ready.
- **Unchecked:** how Claude behaves under the new text. The checks (`check_toolkit.py`, `pytest`, `openspec validate`) only confirm the files are valid, not the replies.
