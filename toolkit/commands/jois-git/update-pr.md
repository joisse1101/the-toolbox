---
name: "JOIS: Update PR"
description: Bring the open PR of the current branch up to date - restack after its base PR merged, push new commits, refresh the title and body. Manual only; never merges.
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git fetch:*), Bash(git ls-remote:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git rebase:*), Bash(git push:*), Bash(gh repo view:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh pr edit:*)
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: >-
            powershell -NoProfile -Command "if ([Console]::In.ReadToEnd() -match 'gh\s+(pr\s+(merge|.*--auto)|api\b.*merge)') { [Console]::Error.WriteLine('update-pr never merges: the user runs gh pr merge'); exit 2 }"
metadata:
  version: "1.2.1"
  last_updated: "2026-10-30"
---

# Update PR

Bring the open PR of this branch up to date.

- Up to three things can apply, in this order: a restack, a push, a refreshed title and body.
- The PR body rules are in the sections at the end: PR body template and Author Verification.
- They are the same text as in `/jois-git:write-pr`.
  - Read "group" there as this one PR.
  - Read `gh pr create` there as `gh pr edit`.

## Never

- Never merge.
  - This means no `gh pr merge`, no `--auto`, no auto-merge and no merge through `gh api`.
  - A hook blocks it.
  - The user merges.
- Never rebase, push or edit the PR before the user types the confirmation word.
- Never use `--force`.
  - `--force-with-lease` is allowed only for the push of a restack that the presentation showed and the user confirmed.
- Never rename the branch.
- Never delete the old base branch.
- Never run a command the user has not agreed to.
- Never edit code to make a run pass.
- Never put a PR body inline in a shell command. Pass it from a file (step 8).

## Steps

1. **Check.**
   - Run `git branch --show-current`.
   - Get the default branch from `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`.
   - On the default branch, stop.
     - There is no PR to update. Use `/jois-git:write-pr`.
   - Find the PR with `gh pr list --head <branch> --state open --json number,baseRefName,url`.
   - If there is none, run `gh pr list --head <branch> --state closed --json number,baseRefName,mergedAt,url`.
     - A closed, unmerged PR whose `baseRefName` no longer exists on `origin` was closed by GitHub when its base branch was deleted.
     - The base is gone when `git ls-remote --heads origin <base>` prints nothing.
     - For such a PR, say it cannot be reopened and to use `/jois-git:write-pr`, then stop.
     - Otherwise say there is no open PR, to use `/jois-git:write-pr`, and stop.
   - Note uncommitted changes (`git status --short`). They are not in the PR.
2. **Read.**
   - Run `git fetch`.
   - Then run `gh pr view <n> --json number,title,body,baseRefName,url`.
   - Run `git log --format="%h %s" HEAD..origin/<branch>`.
     - If it shows commits the local branch lacks, say so and stop. The user reconciles them.
   - Commits to push: `git log --reverse --format="%h %s" origin/<branch>..HEAD`.
3. **Restack?**
   - It applies only when `baseRefName` is not the default branch.
   - It applies when both of these hold:
     - `gh pr list --head <base> --state merged --json number,baseRefName` shows a merged PR into the default branch.
     - `git ls-remote --heads origin <base>` still finds the base branch.
   - A base that has an open PR, or no PR, is left alone.
   - When it applies, the new base is `origin/<default>`.
   - Otherwise the new base is `origin/<baseRefName>`.
4. **Read the PR's commits.**
   - Run `git log --reverse --format="%h %s" origin/<new-base>..HEAD`.
   - Then run `git diff --numstat origin/<new-base>...HEAD`.
   - After a restack these are the commits that remain.
   - If there are no commits, say so and stop.
   - Scan the added lines.
     - Block, naming the file, on a secret or credential, an `.env*` file, a `*.pem` or `*.key` file, or build output.
     - Warn on `console.log`, `print` or `debugger` calls and commented-out code.
5. **Classify, then gather verification.**
   - Decide whether the PR needs no tests, as Needs no tests below says.
   - If it does, skip this step: no run offer and no question.
   - Otherwise gather verification as Author Verification says.
     - The order is `tasks.md`, runs seen in this conversation, then the offer to run missing tests.
   - If a question is needed, ask it once, in plain text, and end the turn.
   - Continue from the reply.
6. **Compose** the new body from the PR body template, as the sections below say, from the commits in step 4.
   - A PR that needs no tests gets a one-sentence Summary and no testing block.
   - The title stays as it is, unless one of these holds:
     - The user asked for a new one.
     - It no longer fits the commits: a one-commit PR whose commit subject changed, or commits of another type added.
   - A new title is `type(scope): subject`, lowercase, imperative, with no period.
     - The squash merge makes it the commit on the base.
   - Never invent a related issue.
7. **Compare.**
   - Write the new body to a file outside the repository with the file-writing tool.
     - Use the session's scratch directory if it names one, otherwise the OS temp directory.
   - Save the live body next to it with `gh pr view <n> --json body -q .body > <scratch>/live-body.md`.
   - Then run `git diff --no-index <scratch>/live-body.md <scratch>/new-body.md`.
   - Name any text the live body has that the template does not produce.
   - The new body drops that text unless the user says to keep it.
8. **Present and stop.**
   - Show, in this order, what will happen after the word:
     - The restack, if any: `git rebase --onto origin/<default> <old-base> <branch>`, `git push --force-with-lease`, `gh pr edit <n> --base <default>`.
     - Otherwise the push, if any: the commits a plain `git push` sends.
     - Whether the PR needs tests and why, in one line, so the author can reply that it does.
     - The title (old and new, or "unchanged") and the body diff.
     - The size.
     - Any dropped text.
     - Any warning, block, or run reported as failed, timed out or out of date.
   - Tag each verification bullet and reviewer step with its source (Author Verification, Sources).
   - Name a common confirmation word that differs from your previous prompt's.
   - Say: "Reply with <word> to do this, or tell me what to change."
   - Then end the turn and call no tool.
   - "Yes" or "looks good" is not the word.
   - After any change request, present again with a new word.
   - If there is nothing to restack, push or change, say the PR is up to date and stop.
9. **Apply** after the word, in this order, stopping at the first failure.
   - Restack:
     - Run `git rebase --onto origin/<default> <old-base> <branch>`.
     - On a conflict, run `git rebase --abort`, leave the branch as it was, report the conflict and stop.
     - Then run `git push --force-with-lease`.
     - Then run `gh pr edit <n> --base <default>`.
     - This push sends the new commits too.
   - No restack and commits to push:
     - Run a plain `git push`.
     - If it is rejected, report it and stop. Never force.
   - Body:
     - Write the new body, without the source tags, to the file from step 7 with the file-writing tool.
     - Never write it from a shell command and never put it inline in one.
     - The hook refuses any shell command whose text contains the merge words, and a body may contain them.
     - Run `gh pr edit <n> --body-file <path>`.
     - Add `--title "<title>"` only when the title changes.
   - Then run `gh pr view <n> --json title,baseRefName,url` to confirm.
10. **Summarize.**
    - Give the PR number, URL and base.
    - Say what ran (restack, push, body, title) and what did not and why.
    - The branch is unchanged and you stay on it.
    - Give the merge command for the user to run, and run none.
      - Use `gh pr merge <n> -s -d`.
      - Use `gh pr merge <n> -s` without `-d` when another PR is based on this branch, because deleting its branch closes that PR.
    - After a restack, remind the user that the old base branch is still on `origin`.
      - `git push origin --delete <old-base>` removes it.

## PR body template

Fill every section below, then delete the `<!-- -->` comments before opening the PR.

- Keep the emoji headings exactly as written.

```markdown
## 📌 Summary
<!-- What this PR does and why it is needed. Lead with the why; the diff already shows the what.
     One sentence when the group needs no tests. -->

## 🔗 Related Issues / Tickets
<!-- OMIT THIS WHOLE SECTION unless a commit message or the branch name references an issue or ticket
     (Closes #123, Fixes PROJ-456). Never invent one. -->

## 🛠 Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to fail)
- [ ] ♻️ Refactoring / Technical Debt (no logical/functional changes)
- [ ] 📚 Documentation / Comments
- [ ] 🧪 Tests (adding missing or updated tests)

## 📝 Changes Made
<!-- One bullet per commit in this PR: the commit subject, copied from `git log`. -->
-

## 🧪 How Has This Been Tested?
<!-- List the tests this PR adds or changes under the first box.
     OMIT this heading and the two subsections below when the group needs no tests. -->
- [ ] Automated Unit / Integration Tests passed
- [ ] Manual testing completed

### Author Verification
<!-- What the author ran and saw, one bullet per check. Never state a result no source records. -->
- **Label:** command or input, then the observed result

### How to Test This PR
<!-- Steps for a reviewer, numbered, each command in a fenced block. See Author Verification. -->
1. Fetch and check out this branch.
```

### Ticking rules

- **Type of Change:**
  - `feat` ticks New feature.
  - `fix` ticks Bug fix.
  - `refactor`, `perf` and `style` tick Refactoring.
  - `docs` ticks Documentation.
  - `test` ticks Tests.
  - A `chore`, `build`, `ci` or `revert` group touching only docs or specs ticks Documentation, otherwise nothing.
  - Tick Breaking change when any commit subject has `!` after the type or any commit body has a `BREAKING CHANGE` footer.
  - Several boxes may be ticked.
- **Needs no tests:**
  - Omit the testing block (How Has This Been Tested?, Author Verification and How to Test This PR).
  - Write Summary as one sentence that leads with why.
  - Related Issues, Type of Change and Changes Made follow the rules above.
  - Needs no tests below says when this applies.
- **Automated:**
  - Tick when the group adds or changes a test file.
  - List those files and the test names under the box.
  - The user has said to assume the tests were run.
- **Author Verification:**
  - Bullets come from the matching OpenSpec `tasks.md`, runs seen in this conversation and, where neither has any, the user's answer.
  - The Author Verification section says how.
  - A bullet reports no result its source lacks.
  - Quote a count only when a source records it.
  - With no bullets, write `- None recorded.`
- **Manual:**
  - Tick only when at least one Author Verification bullet is a manual check.
  - A manual check is a command run or behavior observed by hand, not the repository's test command.
  - Otherwise leave it unticked.
- **How to Test This PR:**
  - Steps follow the Author Verification section.
  - Delete the subsection if none survive.
- No visual-proof section. Do not add one.

## Author Verification

How to fill the two testing subsections of the template.

- Sources are read, not guessed.
- Only the runs the user agrees to are executed (Missing verification).

### Needs no tests

A group needs no tests when both of these hold:

- Its commit type is `chore`, `build`, `ci`, `docs` or `revert`.
  - For a group of several commits, every commit's type.
- Its diff changes no behavior.

Judge from the diff, never from a list of paths.

- Behavior is executable code, tests and migrations.
- Behavior is also files that instruct an agent or tool: prompts, skills, commands, hooks and workflows, even when they are Markdown, JSON or YAML.
- Prose documentation, specs, comments, manifests, lockfiles and formatting are not behavior.
- An extension is only a hint. Read the change.
- When unsure, the group needs tests.

Such a group has none of these:

- Verification gathered.
- A run offer.
- A question.
- Any of the three testing headings in its body.

The presentation says which groups need no tests and why.

- The author can reply that one does.
- The next presentation then treats it as needing tests.

### Sources of a bullet

Find the OpenSpec change whose files the group's commits touch.

- It is in `openspec/changes/<name>/` or `openspec/changes/archive/*-<name>/`.
- Read its `tasks.md`.
- Sort each task by its text:

| Task | Bullet |
|---|---|
| Checked, asks to verify, dry-run or run something, and records the outcome (a `(result: ...)` clause or the outcome in the text) | The check and the recorded result. Source `tasks.md N.N, result recorded`. |
| Checked, asks to verify, but records no outcome | The check only, no outcome. Source `tasks.md N.N, no result recorded`. |
| Unchecked, or plain work with nothing to verify | None. |

Then read this conversation for **runs**.

- A run is a test, build, type-check or lint command with its output visible, run by Claude or by the user (`!`).
- Each run yields a bullet with source `chat`, under these rules:
  - A run covers a group only if its directory or paths include a directory the group's diff changes.
  - A run at the repository root covers every group.
  - State only the outcome and counts the output shows.
  - Infer nothing from the command alone.
  - The latest run of a command is the one that counts.
  - If it failed, tell the user it failed and write no passing bullet.
  - If an Edit or Write in the conversation touched a file in the group's diff after the run, tell the user the run is out of date and write no bullet for it.
  - A summarized history, or a session with no runs, contributes nothing.
  - Never reconstruct a run you cannot see.
  - A `chat` bullet and a `tasks.md` bullet can both appear, because they record different runs.

Rules for every bullet:

- Never add a result a source lacks.
- Quote a count (tests passed, files copied) only when the source gives it.
- A bullet is **manual** when it is a command run or behavior seen by hand.
- Running the repository's test command is automated.

### Missing verification

A group has none when no source above gives a bullet with a result.

- That means no OpenSpec change, no verification task in `tasks.md`, a task with no recorded result, and no usable run.
- A group that needs no tests is never one of them.

For these groups:

1. **Offer to run.**
   - Pick, per group, a command a repository document states.
     - The documents are `CLAUDE.md`, the README, `package.json` scripts and a testing page.
   - It is for a directory the group's diff changes.
   - Copy it as written with no added flags.
   - Every script and path in it must exist in the checkout. Drop it if one does not.
   - Do not invent a command.
2. **Ask once, for all groups, in plain text, then end the turn.**
   - Name each offered command and the directory it runs in.
   - Say it runs on the checked-out branch tip, including uncommitted changes.
   - For a group with no documented command, ask what they ran and saw instead.
   - Say that declining an offer means telling you what they ran, or that none was run.
   - Run nothing before the reply.
3. **After the reply**, run only the commands the user agreed to, each through the normal permission prompt.
   - A passing run becomes a `chat` bullet with the command and the counts its output shows.
   - Report a failing, unreadable or timed-out run to the user.
     - Write no passing bullet.
     - Make no attempt to fix it.
     - The PR is not blocked.
   - Turn any user-stated results into bullets with source `user`, and add nothing the reply did not say.
   - If the user ran nothing, write `- None recorded.` and leave Manual unticked.

### How to Test This PR

Suggest steps from these sources:

- The group's diff.
- Its commit bodies.
- Its `tasks.md`.
- The commands run in this conversation.
- The repository's own documents.

Aim the steps at what the group changes.

- For a fix, show how to confirm the fix, naming the test the group adds and the behavior it confirms.
- For a feature, show how to exercise it.
- The repository's general test command may follow.
  - It is not the only step when the group's own tests or checks can be named.

Keep a step only if it is one of these:

1. **Checkout**: `git fetch`, then `git switch <branch>`. Always first.
2. **Run**: a command a document states, or a command this conversation shows was run (source `chat`).
   - It is for a directory the diff changed, copied as written with no added flags.
   - A conversation command follows the run rules above.
     - It covers the diff's directory.
     - A later edit to the group's files makes it out of date.
     - A failed run is not a step.
   - Check that every script and path in it exists in the checkout.
   - Drop the step if one does not. Do not repair it.
3. **Read**: a file in the diff and why to start there.
   - A script no document explains and the conversation never ran gets a read step at most, never a run step.

Further rules:

- Never invent a command or flag that neither a document nor the conversation shows.
- A summarized history contributes no step.
- Put each command in a fenced block.
- Delete the subsection if only the checkout step is left and the diff has nothing worth reading first.
- A group that needs no tests has no steps.

### Sources

When presenting a PR, tag every bullet and step with one of these:

- `tasks.md N.N, result recorded`
- `tasks.md N.N, no result recorded`
- `chat`
- `repo docs`
- `inferred from diff` (a read step, or a run step chosen among documented commands)
- `user`

The author reviews the draft and the tags show where to look first.

- Strip every tag from the body passed to `gh pr create`.
