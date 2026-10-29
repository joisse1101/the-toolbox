## 1. write-pr

- [x] 1.1 In `toolkit/commands/jois-git/write-pr.md` add the "needs no tests" rule: type gate (`chore`, `build`, `ci`, `docs`, `revert`) plus a diff judgment by behavior classes, no repository paths, uncertain means tests; verify a search for `toolkit/` in the new text finds no path list
- [x] 1.2 Change step 5 to skip groups that need no tests, step 6 to write a one-sentence Summary and no testing block for them, and step 7 to show each group's classification and reason; verify each scenario of "PR content follows the template" and of "Author verification is recorded, not invented" has a matching sentence
- [x] 1.3 In the PR body template and Ticking rules say the testing block is omitted for such a group; verify the template still has every other heading unchanged
- [x] 1.4 Rewrite "How to Test This PR" so steps target the group's behavior and may use a command the conversation shows was run (source `chat`); verify each scenario of "Reviewer steps are grounded and sourced" has a matching sentence
- [x] 1.5 Bump `metadata.version` to "2.4.0" and `last_updated` to "2026-10-29"; verify `python check_toolkit.py` from `toolkit/` reports no version problem for the file

## 2. update-pr

- [x] 2.1 Copy the changed "PR body template" and "Author Verification" sections into `toolkit/commands/jois-git/update-pr.md` unchanged; verify `python check_toolkit.py` from `toolkit/` reports no difference between the two files
- [x] 2.2 Apply the skip to its steps 5, 6 and 8 (no question, one-sentence Summary and no testing block, classification shown); verify the steps match the wording of `write-pr` steps 5 to 7 for a single PR
- [x] 2.3 Bump `metadata.version` to "1.2.0" and `last_updated` to "2026-10-29"; verify `python check_toolkit.py` passes

## 3. Docs

- [x] 3.1 In `toolkit/README.md` update the `/jois-git:write-pr` and `/jois-git:update-pr` entries: no testing block for a group that needs no tests, targeted reviewer steps; verify `python check_toolkit.py` passes

## 4. Verification

- [x] 4.1 Run `python check_toolkit.py` and `python -m pytest` from `toolkit/` and verify both pass
- [x] 4.2 Run `openspec validate improve-write-pr-testing --strict` and verify it passes
