# Design

## Context

The replies rule loads in every session, so its text shapes every reply. The #57 patch kept the list-of-mechanics shape and added bullets, which is why over-asking and hard-to-follow replies persisted. The user's principle: anyone should be able to follow the conversation by reading only it; if not, there is too much jargon.

## Decisions

Each decision below was made on a sensible default, not asked of the user, unless marked.

- **Rewrite, do not patch.** The user asked for the rule to be remade. The rule is grouped by what the reader needs (Words, Shape, Deciding, Asking) instead of a flat list.
- **One vocabulary bullet covers chat, wikis and code comments.** "An artifact you can point to" names a glossary page, wiki page or code comment, so no extra rule file is needed and nothing loads for code files.
- **Documents rule gets one bullet.** It is scoped to markdown, which is where glossary pages live.
- **Size limit about 20 lines.** Three new ideas do not fit in 10. The cost is a few lines per turn. The spec limit is raised to match.
- **Criteria for asking are three, written in the rule.** Preference with nothing favouring an option, answer not findable, wrong guess hard to undo or outside the repo. Stated this way so "the user's to make" is not left vague. User confirmed this wording.
- **AskUserQuestion is preferred, not required.** Without it the rule falls back to a plain question at the end. The rule does not cap the number of options.
- **The precedence line stays.** A user's request for detail and a project's CLAUDE.md win.

## Risks

- A longer always-loaded rule costs context on every turn. Mitigation: short bullets, one idea each.
- "Sensible default" is a judgement call. Mitigation: the rule requires saying what was chosen and why, so the user can overrule.
- Unchecked: whether the rewritten rule changes Claude's behaviour in practice. This cannot be tested by the toolkit checks; the user judges it in use.
