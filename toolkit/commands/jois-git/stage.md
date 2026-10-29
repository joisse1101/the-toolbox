---
name: "JOIS: Stage"
description: "Clear a messy working tree one concern at a time: stage, propose a message, wait for a confirmation word, commit, repeat until clean"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git restore --staged:*), Bash(git apply --cached:*), Bash(git commit:*)
disable-model-invocation: true
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
---

Clear a messy working tree in clean single-concern commits, each confirmed by the user.

- This does not need an OpenSpec change.
- Follow the jois-git-commit-hygiene rule throughout.

## Limits

### Commits

- Never commit without the user typing the word from your most recent prompt.
- "Yes", "looks good" and "continue" are not the word.
- Never use `--amend`.
- Never push, reset, rebase, stash or clean.

### Staging

- Never use `git add .`, `git add -A` or `git commit -a`.
- Stage by explicit path.

### Checks

- Never commit while the build, type-check or tests fail, unless the commit is the fix.
- Find the check commands in `CLAUDE.md` or the project config.
- Run them before presenting a concern.
- If none can be found, say so and present anyway, noting that the changes are unchecked.

## Each turn (the loop)

1. **Read the tree.**
   - Run `git status --short` and the diffs (`git diff`, `git diff --staged`).
   - Read untracked files that are not obviously unsafe.
   - Changes already staged belong to the analysis, so say so.
   - Unstage with `git restore --staged <path>` anything that mixes concerns.
2. **Skip unsafe files.**
   - Never stage secret files: `.env*`, `*.pem`, `*.key` or credentials.
   - Never stage build output that is not gitignored: `node_modules`, `dist`, `build`, `__pycache__`, `*.log` or caches.
   - Name each skipped file and suggest adding it to `.gitignore`.
   - Skipped files do not count against a clean tree.
3. **Pick the first concern.**
   - A concern is what the change does, not a file count.
   - Each of these is one concern however many files it touches: deletions, a rename or move, a regenerated or binary asset, a lockfile, and a format-only change.
   - None of them shares a commit with a behavior change.
   - Split a hand-written change over about 200 lines or 5 files, or one that spans more than one layer.
   - Tests, specs and docs ship with the change they describe.
4. **Stage it by explicit path** with `git add <path>`.
   - If one file holds two concerns, split it as described under "Splitting a file that holds two concerns".
5. **Verify** with the checks from the Limits section.
   - If they fail and this concern is not the fix, do not present it.
   - Report the failure and stop.
6. **Present and end the turn.**
   - Run `git diff --staged --stat`.
   - Print the following as plain text, not in a question tool:
     - The staged file summary.
     - The proposed message, as `type(scope): subject`.
       - The type is feat, fix, refactor, perf, style, docs, test, build, ci, chore or revert.
       - The subject is lowercase and imperative, with no trailing period.
       - The session's `Co-Authored-By` line comes last.
     - The list of concerns still waiting.
     - The skipped files.
   - Name a common confirmation word that differs from the word in your previous prompt.
   - Say: "Staged. Reply with <word> to commit, or tell me what to change."
   - **Then end the turn. Do not call AskUserQuestion or any other tool, and do not run `git commit`.**

## When the user replies

- **The current word:**
  - Run `git commit` with exactly the proposed message.
  - Record the short hash.
  - Go back to step 1 in the same turn for the next concern.
- **A request for changes:**
  - Edit and restage.
  - Present again with a new word.
  - End the turn.
- **Anything else:**
  - This includes "yes", approval of the work, or an earlier word.
  - Do not commit.
  - Restate the current word.

## Splitting a file that holds two concerns

`git add -p` does not work here, so build a patch instead.

1. Write the wanted hunks to a patch file.
   - Take them from `git diff -- <path>`.
   - Keep only the hunks of this concern, with their headers and correct line counts.
2. Check it with `git apply --cached --check <patch>`.
3. Apply it with `git apply --cached <patch>`.
4. Delete the patch file.

If a clean patch cannot be built, do not guess.
- A clean patch cannot be built when hunks overlap or the lines are interleaved.
- Report the file and name the two concerns.
- Ask the user to split the edit.

## Done

- Done means `git status` shows no changes except skipped files.
- Print the commits made, as short hash and message.
- Name the skipped files.
- Then stop.
