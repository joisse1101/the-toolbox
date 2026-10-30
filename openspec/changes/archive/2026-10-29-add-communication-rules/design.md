## Context

- Rules live in `toolkit/rules/` and the installer copies each `.md` file there.
- `check_toolkit.py` treats any rule that is not code-scoped or unscoped as a technology rule that needs `paths:`.
- Today one rule is unscoped: `jois-git-commit-hygiene.md`.
- Motivation is in proposal.md. Requirements are in the `toolkit-communication-rules` spec.

## Goals / Non-Goals

**Goals:**
- Give Claude a standing rule for chat replies that costs little on every turn.
- Give Claude a separate rule for markdown it writes, loaded only when needed.

**Non-Goals:**
- Rewriting the existing rules and skills to follow the documents rule. That is a later change.
- Slash commands `/talk-slow` and `/tell-me-more`. Not in issue #23. See Follow-ups.
- Capping the number of options. Decided against.

## Decisions

### Two rules, not one
- The replies rule is unscoped and short. It loads on every turn.
- The documents rule is scoped to `**/*.md` and can be longer. It loads only when a markdown file is touched.
- Alternative: one unscoped rule. Rejected, because the document guidance would load on every turn for no benefit.

### Names follow `jois-<area>-<topic>`
- `jois-comms-replies.md` and `jois-comms-documents.md`.
- `comms` is the area, matching the worktree name.

### Docs check: extend the unscoped list
- Add `jois-comms-replies.md` to `UNSCOPED_RULES`.
- The `documents` rule needs no code change: `md` is not used by another rule, so the technology-rule check passes.
- Alternative: derive the unscoped list from the rules themselves. Rejected, because the list is what makes a missing `paths:` an error and not a choice.

### Tests run over the unscoped list
- The two existing unscoped-rule tests become parametrized over `UNSCOPED_RULES`.
- A third unscoped rule then needs no new test.

### Closing: a next step or numbered questions
- Questions the user must answer close the reply as a numbered list, set apart.
- Numbered, so the user can answer by number.
- A reply may hold several questions. The issue comment's "one question only" is not taken.
- With no question, the reply ends with one clear next step.
- The issue comment's "at most two options" is not taken either.

### Precedence line in the replies rule
- Explicit user requests for detail and a project's `CLAUDE.md` win.
- This matches how the README already describes the other rules.

## Follow-ups

No GitHub issue is opened for these. Decide after the rules have been in use.

### Rewrite existing rules and skills
- Make the toolkit's own rules and skills follow the documents rule.
- Planned as its own change.

### Commands `/talk-slow` and `/tell-me-more`
- Source: the three files attached to issue #23 (a `communication` skill and the two commands).
- `/talk-slow` is a stricter reply mode: simple words, short sentences, one decision at a time.
- `/tell-me-more` is a full-detail mode: reasoning, trade-offs and examples.
- Not added now. The replies rule already lets an explicit request for detail win, and `/talk-slow` mostly repeats the new default.
- Revisit if, after using the rules for a week or two, a stricter or deeper mode is still needed.
- Drop from the attachments: "at most two options" and "bullets only if 3 or fewer", which conflict with decisions made here.

## Risks / Trade-offs

- [The replies rule grows and costs context on every turn] → Keep it to about 10 lines; add anything else to the documents rule.
- [The documents rule loads in the toolkit's own `.md` files, which do not follow it yet] → The retrofit is the next change; until then the rule describes the target, not the current state.
- [`md` scope also covers generated or vendored markdown] → Accepted. The rule only guides what Claude writes.
