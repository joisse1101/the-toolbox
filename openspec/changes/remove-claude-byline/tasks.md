# Tasks

## 1. Remove the byline from the commit and PR commands

- [x] 1.1 Remove the `Co-Authored-By` step from `toolkit/commands/jois-git/stage.md` (line 67) and verify that `grep -n "Co-Authored-By" toolkit/commands/jois-git/stage.md` prints nothing
- [x] 1.2 Remove the attribution-line step from `toolkit/commands/jois-git/write-pr.md` (line 100) and verify that `grep -niE "attribution|co-authored" toolkit/commands/jois-git/write-pr.md` prints nothing

## 2. Final check

- [x] 2.1 Run the toolkit checks and tests from `toolkit/`: `python check_toolkit.py` and `python -m pytest`. Verify both exit with code 0, record the counts line for each, and confirm a search of `toolkit/` for `Co-Authored-By` and `attribution line` finds no instruction that adds the line

## Workflow follow-up

- The user turns off the attribution setting in `~/.claude/settings.json` by hand, as proposal.md describes. This is not an apply task.
- The user makes a test commit and a test PR draft to confirm no byline appears, as design.md describes.
- Archive the change after the two commands and their specs are merged.
