---
name: "JOIS: Write PR"
description: Open GitHub pull requests for the commits on the current branch, grouped by concern, from the team template. Manual only; never merges.
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git fetch:*), Bash(git ls-remote:*), Bash(git merge-base:*), Bash(git rev-parse:*), Bash(git switch:*), Bash(git cherry-pick:*), Bash(git push:*), Bash(gh repo view:*), Bash(gh pr list:*), Bash(gh pr create:*)
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: >-
            powershell -NoProfile -Command "if ([Console]::In.ReadToEnd() -match 'gh\s+(pr\s+(merge|.*--auto)|api\b.*merge)') { [Console]::Error.WriteLine('write-pr never merges: the user runs gh pr merge'); exit 2 }"
metadata:
  version: "2.4.1"
  last_updated: "2026-10-30"
---

# Write PRs

Turn the commits on this branch into one or more PRs.

- The steps come first.
- The rules are in the sections below the steps: Guidelines, PR body template and Author Verification.

## Never

- Never merge.
  - This means no `gh pr merge`, no `--auto`, no auto-merge and no merge through `gh api`.
  - A hook blocks it.
  - The user merges.
- Never push or create anything before the user types the confirmation word.
- Never force-push.
- Never use the default branch as a PR head.
  - Commits made on it go to new branches (step 8).
- Never reset the default branch with `git reset`.
- Never reset it before every PR is opened (step 8).
- Never run a command the user has not agreed to.
- Never edit code to make a run pass.
- Never put a PR body inline in a shell command. Pass it from a file (step 8).

## Steps

1. **Check.**
   - Run `git branch --show-current`.
   - Get the base from `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`.
   - On the base branch, carry on.
     - Its commits ahead of the remote go to new branches in step 8.
     - Step 2 stops if there are none.
   - On any other branch, run `gh pr list --head <branch> --state open`.
     - If it shows a PR, report it and stop.
   - Note uncommitted changes (`git status --short`). They are not in any PR.
2. **Read.**
   - Run `git fetch`.
   - Then run `git log --reverse --format="%h %s" origin/<base>..HEAD`.
   - Then run `git diff --numstat origin/<base>...HEAD`.
   - Always use the remote base.
     - The local one may be behind and would count merged commits as part of this branch.
   - If `origin/<base>` does not exist, say so and stop.
   - If there are no commits, say so and stop.
3. **Group by concern.**
   - Make one group per logical unit of work.
   - Refactors never share a group with features.
   - Test, docs and OpenSpec archive commits join the group they describe.
     - They form their own group only when the whole branch is that kind of change.
   - Flag a group over about 400 changed lines.
   - Name each new branch as Branch names below says.
   - On a feature branch with one group, the PR head is the current branch under its existing name.
     - It is never renamed.
   - On the base branch every group, even one, gets a new branch.
4. **Scan each group's added lines.**
   - Block that group, naming the file, on any of these:
     - A secret or credential.
     - An `.env*` file.
     - A `*.pem` or `*.key` file.
     - Build output.
   - Warn, without blocking, on `console.log`, `print` or `debugger` calls and commented-out code.
5. **Classify, then gather verification.**
   - Decide for each group whether it needs no tests, as Needs no tests below says.
   - Skip those groups here: no run offer and no question.
   - For every other group, gather verification as Author Verification below says.
     - The order is `tasks.md`, runs seen in this conversation, then the offer to run missing tests.
   - If a question is needed, ask it once for all those groups, in plain text, and end the turn.
   - Continue from the reply.
6. **Compose** each PR from the PR body template.
   - Title:
     - For a one-commit group, use the commit subject.
     - Otherwise write a new `type(scope): subject`, lowercase, imperative, with no period.
     - The squash merge makes it the commit on the base.
   - Summary leads with why.
   - Related Issues come only from `#n` or ticket ids in commit messages or the branch name.
     - Otherwise omit the section.
   - Changes Made lists the group's commit subjects from `git log`.
   - A group that needs no tests:
     - Summary is one sentence.
     - The body has no testing block.
   - Any other group:
     - Tests lists the test files the group adds or changes, and their names.
     - Fill Author Verification and How to Test This PR as the Author Verification section says.
     - Never state a result no source records.
   - End with the PR attribution line the session gives, if any.
7. **Present and stop.**
   - Show the groups with their commits.
   - For each PR show:
     - The title.
     - The base.
     - The head.
     - The body.
     - The size.
     - Any warning or block, including any run reported as failed, timed out or out of date.
   - On the base branch, also state: "After the PRs are pushed, local `<base>` is set to `origin/<base>`; your commits stay on the new branches."
   - For each group say whether it needs tests and why, in one line, so the author can reply that it does.
   - Tag each verification bullet and reviewer step with its source (Author Verification, Sources).
   - Name a common confirmation word that differs from your previous prompt's.
   - Say: "Reply with <word> to open these PRs, or tell me what to change."
   - Then end the turn and call no tool.
   - "Yes" or "looks good" is not the word.
   - After any change request, present again with a new word.
8. **Open** after the word, one group at a time, in dependency order.
   - On the base branch with one group, when `git merge-base --is-ancestor origin/<base> <base>` succeeds:
     - Run `git switch -c <branch>`.
     - The commits and any uncommitted changes come along.
   - Any other group, including every group on a base branch that has diverged from the remote or has several groups:
     - Run `git switch -c <branch> origin/<base>`.
     - Then run `git cherry-pick` on its commits in order.
     - On a conflict, run `git cherry-pick --abort`.
     - Retry on the branch of the group it depends on, and base that PR on that branch.
     - A group that is the only one on a feature branch needs neither.
   - Write the body, without the source tags, to a temporary file outside the repository.
     - Use the file-writing tool.
     - Use the session's scratch directory if it names one, otherwise the OS temp directory.
     - Never write it from a shell command and never put it inline in one.
     - The hook refuses any shell command whose text contains the merge words, and a body may contain them.
   - Run `git push -u origin <branch>`.
   - Then run `gh pr create --base <base> --head <branch> --title "<title>" --body-file <path>`.
   - Record the number and URL.
   - If you started on a feature branch, return to it when done.
   - If you started on the base branch, reset it last.
     - Do this only when every push and `gh pr create` succeeded.
     - Also require that every commit from step 2 belongs to a group whose PR was created.
     - Note `git rev-parse <base>`.
     - Switch to the last PR branch opened.
     - Then run `git branch -f <base> origin/<base>`.
     - Never use `git reset`. `branch -f` leaves the working tree and uncommitted changes alone.
     - If anything failed, leave `<base>` as it is and say so.
9. **Summarize** (below).

## Final summary

List every PR opened.

- Give the number, title, URL and base of each.
- Put them in the order to merge.
  - Dependent PRs come in stack order.
  - Mark independent ones "any order".
- Give each a merge command for the user to run, and run none.
  - A PR that no other opened PR is based on: `gh pr merge <n> -s -d`.
  - A PR that another opened PR is based on: `gh pr merge <n> -s`, without `-d`.
    - Deleting its branch closes the PR based on it.
    - GitHub can then neither retarget nor reopen that PR.
- For each later PR in a stack, list these steps for after its base PR merges, in this order:
  1. `git fetch`
  2. `git rebase --onto origin/<base> <earlier-branch> <branch>`
  3. Push with `--force-with-lease`.
  4. `gh pr edit <n> --base <base>`
  5. Delete the earlier branch with `git push origin --delete <earlier-branch>`.
- If the command reset the base branch, say so.
  - Give the old tip hash, which the reflog also keeps.
- Say which branch you are on now.
- If no PR was opened, say so and why.

## Guidelines

Read this while grouping commits and writing titles and bodies.

### Rule 1: Keep scope small and focused

- A PR solves one issue or implements one feature.
- Aim for under 200-400 changed lines.
  - Large PRs are hard to review and prone to bugs.
  - Past about 300 lines review quality drops sharply, so split into stacked or smaller PRs.
- Never combine refactoring or formatting with new feature logic in one PR.

### Rule 2: Descriptive titles and summaries

- Write the title in Conventional Commits form, lowercase and imperative, with no trailing period.
  - Example: `feat(auth): add oauth2 authentication flow`.
  - Example: `fix(cart): prevent negative item quantity on checkout`.
- Explain why the change was made. The diff already shows what changed.

### Rule 3: Self-review and verification

- Check the diff for accidental files (logs, `.env`, temp files) and debug output before opening.
- Say which tests were added or run, and whether manual testing was done.

### Rule 4: Clean commit history

- No vague commits (`fix bug`, `updates`, `wip`).
- Each commit is a logically complete step.
- Squash fixups and temporary commits before review.

### Hard rules

- Automated CI (formatting, lint, static analysis, type checks, tests) must pass.
  - A PR with failing tests cannot merge.
- Never commit API keys, `.env` files, credentials, build artifacts or system files such as `.DS_Store`.
- One logical unit of work per PR.
  - Refactoring and a new feature go in separate PRs.
- No direct commits to `main` or production branches.
  - Every change goes through a feature or bugfix branch and a PR with at least one human approval.

### Branch names

These rules apply to a branch this command creates.

- Format: `<type>/<ticket>-<slug>` when a commit message in the group or the current branch name references a ticket.
  - Otherwise use `<type>/<slug>`.
  - Never invent a ticket.
- Type: the commit type of the group's title.
  - It is one of `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`, `ci`, `chore` or `revert`.
  - Not `feature/` or `bugfix/`.
- Ticket: keeps the case the tracker writes (`PROJ-456`).
  - A GitHub issue `#123` becomes `123`.
- Slug: lowercase kebab-case of letters, digits and hyphens, two to four words, imperative (`add-oauth-login`).
  - Never a bare `fix`, `update` or `test`.
- Collision: check `git branch --list <name>` and `git ls-remote --heads origin <name>`.
  - If the name exists in either, propose another and never reuse it.
- Examples: `feat/add-oauth-login`, `fix/PROJ-456-prevent-negative-quantity`, `fix/123-checkout-crash`.

### Best practices

- Read your own diff on the platform before asking for review.
  - Look for debug logging, commented-out code and unintended files.
- Give the reasoning behind architectural decisions in the description.

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
