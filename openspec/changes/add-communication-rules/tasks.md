## 1. Docs check and tests

- [x] 1.1 Add `jois-comms-replies.md` to `UNSCOPED_RULES` in `toolkit/check_toolkit.py` and verify `python check_toolkit.py` still reports no problem for the commit rule
- [x] 1.2 Parametrize the two unscoped-rule tests in `toolkit/tests/test_check_toolkit.py` over `UNSCOPED_RULES` and verify `python -m pytest` passes from `toolkit/`
- [x] 1.3 Add a test that a markdown-scoped rule (`paths: "**/*.md"`) passes the technology-rule check and verify it passes

## 2. Rules

- [x] 2.1 Write `toolkit/rules/jois-comms-replies.md` (metadata header, no `paths:`, about 10 lines, covering the spec's reply requirements, including numbered closing questions) and verify `python check_toolkit.py` passes
- [x] 2.2 Write `toolkit/rules/jois-comms-documents.md` (metadata header, `paths: ["**/*.md"]`, covering the spec's document requirements, including next-step owner and date and marking known, assumed and unchecked) and verify `python check_toolkit.py` passes
- [x] 2.3 Verify the installer lists both rules with `Install-Toolkit.ps1 -List` and needs no code change

## 3. README

- [x] 3.1 Update `toolkit/README.md`: add both rules to the rules list, change "the one exception" to two unscoped rules, and say why the replies rule is short; verify `python check_toolkit.py` and `python -m pytest` pass from `toolkit/`

## 4. Follow-up

- [x] 4.1 Confirm design.md's Follow-ups section lists the rewrite of existing rules and skills, and the `/talk-slow` and `/tell-me-more` commands, and verify no GitHub issue is needed for either
