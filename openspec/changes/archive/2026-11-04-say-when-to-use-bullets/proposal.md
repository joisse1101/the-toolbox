# Proposal

## Why

The documents rule tells Claude how to write a bullet but not when to use one. Its two instructions, "one idea in one short sentence" and "a header per topic", both favour small pieces, so a writer who follows them literally splits an explanation into one-line bullets. The words "because" and "so" then have nothing left to connect, and the reader has to rebuild the argument. The rule should say that bullets are for parallel items and that reasoning belongs in a short paragraph (GitHub issue #81).

## What Changes

The change edits the rule and the two places that restate it, and adds a before-and-after test of the rule using subagents.

- Add six points to `toolkit/rules/jois-comms-documents.md`:
  - Bullets are only for parallel items that can be reordered without losing meaning. Explanations, reasons and cause-and-effect go in a short paragraph.
  - A read-aloud test: a bullet that starts with "So", "Because" or "This", or only makes sense after the one before it, becomes a paragraph.
  - Fewer than three bullets is a sentence, and a bullet with two sentences is a paragraph split wrongly.
  - A header needs a paragraph of content, not a single bullet.
  - Numbered lists are for steps a person does in order.
  - When rewriting existing text, check that each "why" and "because" from the old text survives.
- Reword "one idea in one short sentence" so it applies only to bullets that remain after the test, and place it last in the Bullets section.
- Rewrite the rule's own sections as short paragraphs where they hold fewer than three bullets, so the file follows its own rule.
- Bump the rule to `1.2.0` with `last_updated` set to 2026-11-04.
- Bring `openspec/specs/toolkit-communication-rules/spec.md` and the README summary at `toolkit/README.md` (lines 575–577, which the issue gave as 556–558) in line with the new rule.
- Add a sentence to the spec requirement "Toolkit markdown follows the documents rule" saying that files written before this change are brought in line when next edited. Without it the requirement would be false the day the rule changes, because rewriting those files is out of scope.
- Test the rule by dispatching subagents that rewrite the same fixture texts once under the old rule and once under the new rule, then compare the results against the intended behaviour.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-communication-rules`: the requirement "Documents are organized" gains the bullet-or-paragraph rules, the read-aloud test, the fewer-than-three rule, the header rule, the numbered-list rule and the rewrite check, and the one-idea-per-bullet wording is limited to bullets that remain. The requirement "Toolkit markdown follows the documents rule" gains the sentence about older files.

## Impact

- Files changed: `toolkit/rules/jois-comms-documents.md`, `toolkit/README.md`, `openspec/specs/toolkit-communication-rules/spec.md` (through this change's delta spec).
- Out of scope, as the issue states: rewriting existing toolkit files to match, and `toolkit/rules/jois-comms-replies.md`. The replies requirements in the spec also say one idea per bullet and stay as they are. Whether the replies rule needs the same fix is a separate decision.
- Installed copies of the rule, such as the one in `~/.claude/rules/`, only update when the installer is run again. This change does not do that.
- `python check_toolkit.py` only checks that the rule is scoped to `md`, so it is a weak signal here. The subagent comparison is the real check.
