# Proposal

## Why

GitHub issue 53: the replies rule ends every reply with a numbered list of full questions. Claude then looks for something to ask each time, numbers a lone question, and splits one decision into several numbered alternatives. This takes away its autonomy and makes replies confusing.

## What Changes

- Rewrite the question and ending bullets (lines 15-17) of `toolkit/rules/jois-comms-replies.md`.
- The new rule tells Claude to act on a sensible default and say which one it chose.
- It asks only when blocked on a decision that is the user's to make.
- One question is a plain sentence at the end, not numbered.
- Several independent questions are numbered; alternatives are options inside one question.
- With nothing to ask, the reply ends with one clear next step.
- Bump `version` and `last_updated` in the rule's frontmatter.
- Update the "Replies end with a next step or numbered questions" requirement in the spec to match.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-communication-rules`: the ending requirement changes from "numbered list of questions when it needs answers" to defaults first, a plain sentence for one question, a numbered list only for several independent ones.

## Impact

- `toolkit/rules/jois-comms-replies.md` (rule text and frontmatter).
- `openspec/specs/toolkit-communication-rules/spec.md` (through a delta spec).
- `toolkit/check_toolkit.py` only lists the file, so no change is expected.
- Installed copies, such as the user's global `~/.claude/rules/jois-comms-replies.md`, update only on reinstall. Reinstalling is left to the user.
