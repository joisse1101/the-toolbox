## 1. Rewrite the replies rule

- [x] 1.1 Replace the body of `toolkit/rules/jois-comms-replies.md` with the four sections Words, Shape, Deciding, Asking and the precedence line, as in `design.md` and the spec delta. (result: replaced the body of `toolkit/rules/jois-comms-replies.md` with Words, Shape, Deciding, Asking and the precedence line, per the approved text; `python check_toolkit.py` -> "toolkit check passed")
- [x] 1.2 Bump `version` to `2.0.0` and set `last_updated` to the date of the change in that file's frontmatter. (result: frontmatter now `version: "2.0.0"`, `last_updated: "2026-10-31"`, no `paths:`; `python check_toolkit.py` -> "toolkit check passed")
- [x] 1.3 Check the body is about 20 lines, one idea per bullet. (result: checked by hand and with `wc -l` and `grep -c .` -> 28 body lines, 22 non-blank; each bullet holds one idea)

## 2. Update the documents rule

- [x] 2.1 In `toolkit/rules/jois-comms-documents.md`, change the Words bullet to: define a technical term on first use unless the repo has a glossary or definitions page, then link to it. (result: Words bullet in `toolkit/rules/jois-comms-documents.md` changed to the glossary-or-define wording, kept as one bullet; `python check_toolkit.py` -> "toolkit check passed")
- [x] 2.2 Bump `version` to `1.1.0` and set `last_updated` in that file's frontmatter. (result: frontmatter now `version: "1.1.0"`, `last_updated: "2026-10-31"`, `paths:` unchanged; `python check_toolkit.py` -> "toolkit check passed")

## 3. Align the README

- [x] 3.1 Check `toolkit/README.md` for any statement of the replies rule's length or content and update it to match. (result: grep of toolkit/README.md for the replies rule's length and content -> only the jois-comms-replies bullet at lines 329-330 mentioned them; changed "about 10 lines" to "about 20 lines" and added a one-line content sub-bullet; python check_toolkit.py (run from toolkit/) -> toolkit check passed)

## 4. Verify

- [x] 4.1 Run `cd toolkit; python check_toolkit.py; python -m pytest` and confirm they pass. (result: `python check_toolkit.py` -> "toolkit check passed"; pytest was not installed, so I ran `python -m pip install pytest`, then `python -m pytest -q` -> 33 passed in 1.59s)
- [x] 4.2 Run `openspec validate rewrite-replies-rule` and confirm it passes. (result: `openspec validate rewrite-replies-rule` -> "Change 'rewrite-replies-rule' is valid", with one warning that the "Questions are easy to answer" requirement text is over 500 characters)
