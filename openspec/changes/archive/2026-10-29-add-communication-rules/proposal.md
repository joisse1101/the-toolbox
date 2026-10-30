## Why

Claude's replies are hard to follow: walls of text, jargon, terms it coined earlier in the
session, and questions buried inside paragraphs. The markdown Claude writes (specs, READMEs,
skills, rules) has the same problem: several sentences in one bullet, no headers, no hierarchy.
The toolkit has rules for code and commits but none for how Claude communicates (issue #23).

## What Changes

- Add `toolkit/rules/jois-comms-replies.md`: unscoped, short, loads every session. It covers
  chat replies: answer first, short paragraphs, one idea per bullet, plain words, no unexplained
  jargon or coined labels, and one closing next step or question set apart on its own line.
- Add `toolkit/rules/jois-comms-documents.md`: scoped to `**/*.md`. It covers written markdown:
  a header per topic, a clear hierarchy, one idea per bullet, terms defined on first use.
- Add the replies rule to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` so the docs check
  accepts a second rule without `paths:`.
- Cover both rules in `toolkit/tests/test_check_toolkit.py`; the unscoped-rule tests run over
  every entry of `UNSCOPED_RULES`.
- Update `toolkit/README.md`: list both rules, say there are two unscoped exceptions, and say
  why the replies rule is short.
- Not in this change: rewriting the existing rules and skills to follow the documents rule. That
  is a later change.

## Capabilities

### New Capabilities
- `toolkit-communication-rules`: the two communication rules, their scopes, their content, and
  the docs-check and installer behavior they rely on.

### Modified Capabilities

None. The installer already copies every `.md` file under `toolkit/rules/`, so no existing
requirement changes.

## Impact

- New files: `toolkit/rules/jois-comms-replies.md`, `toolkit/rules/jois-comms-documents.md`.
- Edited: `toolkit/check_toolkit.py`, `toolkit/tests/test_check_toolkit.py`, `toolkit/README.md`.
- No installer change. Installed users get both rules on their next install.
- Context cost: the replies rule loads in every turn, so it stays about 10 lines. The documents
  rule loads only when a markdown file is touched.
