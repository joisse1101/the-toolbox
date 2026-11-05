# Toolkit

Reusable AI-agent skills, slash commands, rules and agents, kept in one place so they have version history
and can be put on any machine or project. Nothing here depends on a vendor's plugin marketplace: a skill,
command, rule or agent is just files, and the script below only automates copying them.

Claude Code is the only supported tool today.

## Quick start

1. Get the toolkit: copy the `toolkit/` folder into the repo or onto the machine you want to use it from.
2. Install everything globally (Windows PowerShell):

   ```powershell
   cd toolkit\install
   .\Install-Toolkit.ps1
   ```

3. Start a new Claude Code session; the skills, commands, rules and agents are now available.

Other things the script does:

```powershell
.\Install-Toolkit.ps1 -List                                   # what's installed, has it drifted, which versions?
.\Install-Toolkit.ps1 -Command jois-git                       # just one command item
.\Install-Toolkit.ps1 -Rule jois-code-java.md                           # just one rule
.\Install-Toolkit.ps1 -Agent opsx-task-applier.md             # just one agent
.\Install-Toolkit.ps1 -Scope project -Path C:\code\my-app     # into a project instead of globally
.\Install-Toolkit.ps1 -Force                                  # overwrite a copy that differs
.\Install-Toolkit.ps1 -NoPackages                            # skip `npm ci` for skills with a package.json
.\Install-Toolkit.ps1 -Uninstall                              # remove toolkit items (only those)
```

Passing `-Skill`, `-Command`, `-Rule` and/or `-Agent` limits the run to those items. An item already
installed that differs from the toolkit's copy is never overwritten unless you pass `-Force`; `-List`
shows it as `differs`. The script writes only inside the skills, commands, rules and agents folders — it
never touches `settings.json` or hooks. Uninstall removes only items the toolkit holds, so the other
agents in `~/.claude/agents/` stay.

### Skills that carry scripts

A skill is a folder, so it may hold scripts, a `lib/` folder, a `references/` folder and a `package.json`.
These rules keep it installable on its own:

- A script imports only files inside its own skill folder. `check_toolkit.py` fails on an import that leaves it.
- A `package.json` needs a `package-lock.json` beside it, so the install is repeatable.
- The installer runs `npm ci` in the installed skill folder when it installs or replaces such a skill.
  It does not run it for a skill that is `up to date`.
- `-NoPackages` skips that step and prints the folder and the command to run by hand.
- If `npm` is missing or `npm ci` fails, the skill's files stay installed, the installer prints the folder
  and the command, the other items continue, and the exit code is 1.
- `node_modules` is left out of the content hash, so a skill with installed packages is still `up to date`.
- `-Force` replaces the whole folder and reinstalls. `-Uninstall` removes the whole folder, `node_modules` included.

#### Node version for the story skills

- The story skills need Node 20.19 or later, or Node 22.7 or later.
- Their `lib/*.js` files use ES module syntax (`import`/`export`) and no `package.json` marks them as modules.
- Node loads such a file as a module only through syntax detection, which is on by default from those versions.
- Unchecked: these two version numbers come from memory of the Node release notes. They were not confirmed against the Node docs, because the docs were not reachable. The tests were run only on Node 24.19.0.

#### Where the story skills find their data

- The story skills read and write backlog files in a data folder. They look only in the folder the session started in, never in a parent folder.
- The order is: the file the `PLANNER_CONFIG` variable names, else a `.plans/` folder in the current folder, else a `planner.config.yaml` in the current folder.
- A config file may set `codeBase` (the data folder is then `<codeBase>/.plans/`) or `dataDir`, not both.
- Start the session in the code base folder. In a sub-folder, a skill finds nothing and says which folder it looked in.
- If nothing is found, `jois-story-propose`, `jois-story-review` and `jois-story-plan` ask before creating `.plans/` in the current folder, through their `init-plans.mjs`.
- `jois-story-explore` never writes, so it only reports that nothing was found.
- A skill creates an empty `.plans/` but never a backlog. Create a backlog in the planner portal.
- Whether `.plans/` is committed or git-ignored is the code base owner's choice. The toolkit never edits `.gitignore`.

## Naming

Every item is named `jois-<domain>-<thing>`. `jois` is the owner, so the names never collide with a
built-in or third-party item (`code-review` is already a built-in skill). The domain says what the
item is for. Domains today:

| Domain | Meaning | Items |
|---|---|---|
| `code` | writing source code | the `jois-code-*` rules, the `jois-code` command |
| `git` | commits and pull requests | the `jois-git` commands, the `jois-git-commit-hygiene` rule |
| `docs` | documents written from notes | the `jois-docs` command |
| `design` | how a user interface looks and how its frontend code is structured | the `jois-design-ui-principles` skill |
| `story` | user-story backlogs: exploring, proposing, reviewing and planning stories | the `jois-story-*` skills, the `jois-story` commands |

Skills and rules are `jois-<domain>-<thing>`; a command namespace folder is `jois-<domain>`, so
`commands/jois-git/stage.md` is `/jois-git:stage`. A new domain (`comms`, `writing`) picks
its own word. The `/opsx:*` commands are the exception: the `openspec` CLI generates them, so they keep their name
and are not stored here (see [OpenSpec setup](#openspec-setup)).

### Migrating from the old names

Before this naming the items were `coding-standards`, `/jois:*` and unprefixed rules. A machine that
has them installed keeps them, and the installer no longer manages them, so a rule would load twice
once the new copy is installed. Remove the old items first:

- skill `~/.claude/skills/coding-standards`
- command folder `~/.claude/commands/jois`
- rules in `~/.claude/rules`: `commit-hygiene.md`, `test-mock-data.md`, `core-principles.md`,
  `architecture-boundaries.md`, `java.md`, `python.md`, `typescript-react.md`, `config-files.md`, `scripts.md`

Then run `.\Install-Toolkit.ps1` again (or with `-Scope project -Path <project>`) and check that
`-List` shows every item `up to date`. In a project, remove the same names from `<project>\.claude`.
Project `CLAUDE.md` files and notes that mention `/jois:stage` and the like need updating by hand.

### Migrating from the `jois-code-standards` skill

The `jois-code-standards` skill is now the `jois-code-quality` rule, which loads while code is
written instead of on request. Delete `~/.claude/skills/jois-code-standards` (in a project,
`<project>\.claude\skills\jois-code-standards`), then run `.\Install-Toolkit.ps1` to add the rule.
For a review, use the built-in `code-review` or `simplify` skills.

## Skills

A skill is a folder `toolkit/skills/<name>/` with a `SKILL.md` (`name` and `description` frontmatter,
then instructions) and any support files it needs. A folder is self-contained.

### The `jois-design-ui-principles` skill

It gives Claude visual-design rules and frontend structure rules, so an interface looks designed and its code is grouped and easy to work with.

- Folder: `toolkit/skills/jois-design-ui-principles/`.
- Install it with `.\Install-Toolkit.ps1 -Skill jois-design-ui-principles`.

When it fires:

- Designing, building, styling, reviewing or polishing a page, component, form, dashboard, card, table or layout.
- Writing the HTML, CSS or React code of such a screen.
- A request such as "make it look better" or a critique of a screenshot.

When it does not fire:

- Behaviour-only changes.
- Command-line tools and backend code.
- Any code with no visual output.

What it does:

- `SKILL.md` holds three principles, the rules by topic in one line each and a review checklist.
- Detail sits in `references/`, which Claude reads only when the task touches the topic.
- It looks for the project's design tokens first. A design token is a named value, such as a colour or a spacing step, kept in one place.
- It uses the project's tokens where they exist.
- It fills only the gaps from the starter values in `references/tokens.md`, and tells you those values are defaults.

The `references/` files:

| File | Read it when |
| --- | --- |
| `tokens.md` | The project lacks spacing, type, radius or shadow tokens, or the starter values are needed. |
| `color.md` | A palette, shades or text colours are chosen or built. |
| `depth.md` | Shadows, raised or inset surfaces or overlapping layers are added. |
| `images-and-polish.md` | The UI has images, icons or empty states, or needs finishing touches. |
| `structure.md` | Markup or components are written or restructured. |

Source and limits:

- The visual rules are a paraphrase of *Refactoring UI* by Adam Wathan and Steve Schoger. No passage is copied.
- The structure rules and every size limit are the toolkit's own, not the book's.
- React mechanics stay in the `jois-code-typescript-react` rule, which the skill links to and does not restate.

## Commands

Each entry directly under `toolkit/commands/` is one command item: a `.md` file (becomes `/name`) or
a folder used as a namespace (`commands/jois-git/stage.md` becomes `/jois-git:stage`). The installer
treats each such entry as a unit, so `-Command jois-git` installs the whole `jois-git` set.

### The `jois-git` commands

#### `/jois-git:stage`

- It clears a messy working tree, with or without an OpenSpec change.
- It stages one concern at a time, shows the message and a confirmation word, and waits.
- Typing the word commits that concern and moves on, until the tree is clean.
- Secret files and build output are skipped and named.
- It has no commit authority of its own.

#### `/jois-git:write-pr`

It opens GitHub pull requests (PRs) for the commits on the current branch.

- It is one file: the steps, the PR guidelines, the body template and the verification rules all sit inside it.
- It reads the commits since the default branch on the remote, so a local branch that is behind does not matter.
- It proposes groups of commits that each form one concern. A refactor never shares a PR with a feature.
- It waits for a confirmation word before it pushes or runs `gh pr create`.
- Each body lists the test files the group adds, an Author Verification list and suggested steps for a reviewer.

Where the verification comes from:

- The OpenSpec change's `tasks.md`.
- Test, build or lint runs it can see earlier in the same chat, so run your tests in the chat before you type the command.
- It states no result that a source did not record.
- When a group has no verification and the repo documents a test command for the directories it changes, it asks once, for all groups, whether to run them.
- It runs only what you agree to. Otherwise it asks what you ran.
- A failing or timed-out run is reported, never fixed, and does not block the PR.

Groups that need no tests:

- A `chore`, `build`, `ci`, `docs` or `revert` group whose diff changes no behavior needs no tests.
- It is judged from the diff, and when unsure the group gets tests.
- Such a group gets a one-sentence summary and no testing block, and is never asked about.
- The presentation says why, so you can reply that it needs tests.
- The reviewer steps aim at what the group changes, such as the test a fix adds, and may use a command you ran earlier in the chat.

Branches and the default branch:

- It also works from the default branch.
- Commits ahead of the remote go to new branches named `type/slug`, or `type/TICKET-slug` when a commit references a ticket.
- The type is a commit type such as `feat` or `fix`.
- Once every PR is opened, the local default branch is set to the remote with `git branch -f`, which leaves uncommitted changes alone.
- The confirmation word covers that reset.
- Nothing is reset if a push or PR failed.

Checks before it opens:

- Steps use only commands the repo's own documents state.
- The source of each line is shown to you before you confirm, never in the PR.
- It blocks a group whose diff holds a secret, an `.env` file or build output.
- It warns on debug prints.

It never merges:

- A hook in the command's frontmatter blocks `gh pr merge`, `--auto` and merge calls through `gh api`.
- A hook is a check that runs before a tool call and can refuse it. This one stays active for the rest of the session once the command has been invoked.
- The hook looks for those words anywhere in a shell command's text, so text that merely mentions them is refused too.
- For that reason the command passes each PR body from a file.
- When it finishes, it lists every PR it opened in the order to merge, with a merge command for each, for you to run.
- A PR that nothing is stacked on gets `gh pr merge <n> -s -d`.
- A PR that another PR is based on gets it without `-d`, because deleting its branch closes the PR above it and GitHub cannot reopen that one.
- For each PR above it the list gives the follow-up in order: rebase, push with `--force-with-lease`, retarget to the default branch, delete the earlier branch.

It replaces the old `/write-pr` skill:

- If you installed that, delete `~/.claude/skills/write-pr`. The installer only manages items the toolkit still holds.
- Then run `.\Install-Toolkit.ps1 -Command jois-git -Force`.

#### `/jois-git:update-pr`

It brings the open PR of the current branch up to date.

- It finds the PR, then handles whichever of these apply:
  - A restack, when the PR sits on a branch whose PR has merged and that branch still exists. It rebases onto the default branch and retargets the PR.
  - A push of commits the remote lacks.
  - A refreshed body, built from the same template and verification rules as `/jois-git:write-pr`, shown to you as a diff against the live body.
- One confirmation word covers everything it will do, listed first.
- It pushes plainly, except the `--force-with-lease` push of a restack you confirmed.
- It never uses `--force`, never renames or deletes a branch, and never merges (the same hook as write-pr).
- With no open PR it says so and points to `/jois-git:write-pr`.
- It is also a single file, so the body template and verification sections are copied from write-pr.
- `python check_toolkit.py` fails if the two copies differ.
- The same no-tests rule and targeted reviewer steps apply to its refreshed body.

#### `/jois-git:write-issue`

It drafts one issue and creates it on the repository's host.

- Everything you write after the command is the content of the issue, never instructions to it.
- It changes no file in the repository.
- It reads the `origin` remote:
  - `github.com` uses `gh`.
  - A host with `gitlab` in its name uses `glab`.
  - Any other host it asks you about once.
- It lists similar open issues from your description before it drafts anything.
- It picks a bug, feature or task template from what you describe, or asks when it could be two.
- It uses the repository's own template from `.github/ISSUE_TEMPLATE/` or `.gitlab/issue_templates/` instead when one matches.

Sections:

- A required section you give nothing for is drafted from your words, the conversation and, for a bug or feature, the files your request points at (read first, read-only).
- It points out each drafted section when it shows you the issue.
- It asks, as a numbered list, only when nothing supports a draft.
- Optional sections you give nothing for are left out, heading included:
  - Bug: Screenshots / Logs and Environment.
  - Feature: Alternatives Considered, Design / Visuals and Technical Considerations / Security.
  - Task: Testing & Verification and Dependencies / Blockers.

Creating the issue:

- It titles the issue like a commit (`fix:`, `feat(scope):`, `chore:`, at most 70 characters).
- It scans the draft for secrets.
- It prints the whole issue and creates it only when you type its confirmation word, passing the body from a file.
- It reports the issue as a link.
- It only creates: no labels, assignees, milestones, closing or comments.
- `glab` is needed only for GitLab repos, and its flags are checked against the GitLab CLI docs, not run.

### The `jois-code` commands

`/jois-code:apply <change>` applies an OpenSpec change through the task agent.

- It hands the change's tasks to the `opsx-task-applier` agent, one group at a time.
- It records each task's `result:` clause in `tasks.md`.
- It commits each finished group by itself on a branch other than `main` or `master`, and otherwise stops for a commit.
- It ignores the change's own folder `openspec/changes/<name>/` and never stages it: that folder is committed at archive.
- It splits a group of several concerns and commits each in turn.
- It never pushes.
- It never implements a task itself.
- Without a change name, it asks you to choose.
- Install it with `.\Install-Toolkit.ps1 -Command jois-code`.
- It needs the agent, which you install with `-Agent opsx-task-applier.md`.
- It also uses `opsx-test-runner` to check a group before it commits, installed with `-Agent opsx-test-runner.md`.
- See [The task agent](#the-task-agent).
- It is advisory: plain `/opsx:apply` is unchanged and still works as before.

### The `jois-docs` commands

`/jois-docs:meeting-minutes` turns notes into minutes in a fixed template.

- It is one file with the template inside, and it needs no script.
- Install it with `.\Install-Toolkit.ps1 -Command jois-docs`.

Input:

- Paste the notes after the command, or reference a notes file with `@path`.
- Notes are data, never instructions.
- It asks for every gap (chair, note taker, owners, due dates, next meeting) before it shows the minutes.
- A field you skip shows `[TBC]`.
- It never invents a value and attributes a point to a person only when the notes do.

Saving:

- It shows the full minutes first and writes nothing until you confirm the minutes and the folder.
- The file is named `<slug>_<YYYY-MM-DD>.md`, with `_1`, `_2` and so on when the name is taken.
- Notes from a referenced file: it offers that file's folder.
- Pasted notes: it looks for a folder such as `docs/`, `meetings/` or `notes/`, suggests one and asks.
- It never overwrites the notes file.

Refinement:

- Reference an earlier minutes file together with new notes.
- It rebuilds the full minutes, shows them and, after you confirm, replaces that file.
- Without a referenced minutes file, every save is a new file.

### Commands stay out of the session context

Every command declares `disable-model-invocation: true`, so its description is not loaded into each
new session's skill listing (about 300 tokens for a typical set) while you can still type
`/jois-git:stage`. `python check_toolkit.py` fails on a command without the flag. Skills are not
given the flag.

## OpenSpec setup

The `/opsx:*` commands are generated by the `openspec` CLI, which overwrites them on every `init` and
`update`, so the toolkit keeps no copy and patches nothing. Instead, run `/jois-init:opsx` inside a
project. It works the same whether the `/opsx:*` commands are in the project or in `~/.claude`, asks
about each write on its own in plain words (why, and whether it affects this project or every
project), and:

- runs `openspec init` when the project has no `openspec/` folder;
- merges a short commit-stop guidance block into the project's `openspec/config.yaml` (between
  `# jois-init:opsx begin` and `# jois-init:opsx end`, so a re-run replaces it and the project's own
  settings stay);
- reads the global `workflows` and, only when `apply` or `archive` is missing (the guidance would
  not take effect), offers to add it as a separate optional question;
- reports when `~/.claude/rules/jois-git-commit-hygiene.md` is not installed;
- ends with one line, e.g. `OpenSpec 1.x | openspec/ present | workflows=ok | guidance: added | commit rule: found`.

It never changes the global `delivery` and never runs `openspec update`.

The `apply` guidance names one exception: `/jois-code:apply` commits a finished group under its own
conditions, and every other apply keeps the confirmation word. Projects set up earlier carry the old
line, so re-run `/jois-init:opsx` in each project to pick up the new one.

The guidance only points at the `jois-git-commit-hygiene` rule, which holds the steps; it is advisory,
and the rule is what enforces them. Accepted losses: the generated `/opsx:*` commands show in the skill
list, and archive's git commands prompt for permission.

### The task agent

`/jois-code:apply <change>` hands the tasks of an OpenSpec change to the `opsx-task-applier` agent, one group at a time.

- A group is one `##` section of the change's `tasks.md`.
- The group's working detail stays in the agent's own context.
- The main conversation keeps one announcement before each group and one line after it.
- Before each dispatch the session says:
  - the group and its tasks
  - the files it expects to touch
  - a rough time estimate, labeled as an estimate
  - that there is no live timer
  - how to open the agent's transcript: its row in the agent panel then Enter, or `/tasks`
  - the agent's turn limit
- After each report it says whether the group is done, failed or blocked.
  - A failure starts a fix round, as described in [Fixing failures](#fixing-failures).
- While the agent works, the command watches the agent's transcript file with the `Monitor` tool.
  - The transcript is `subagents/agent-<id>.jsonl`.
  - If the file does not change for 3 minutes, the command says the agent looks stalled and is probably waiting for a permission approval.
  - It shows the agent's last tool call and where to open the transcript, so you can approve the prompt there.
  - A long test run or build looks the same, so the last tool call tells which it is.
  - The watch never edits a permission rule.
  - If the command cannot find the transcript, it says the watch did not start.
- The ticks in `tasks.md` are the progress across groups.
- The transcript is the view inside one group.
- After each completed group it commits or stops, as described in [Committing a group](#committing-a-group).
- If the session ends, run the command again.
- It resumes from the pending tasks.

#### Install

Install both parts, then start the command in a Claude Code session:

```powershell
.\Install-Toolkit.ps1 -Command jois-code
.\Install-Toolkit.ps1 -Agent opsx-task-applier.md
.\Install-Toolkit.ps1 -Agent opsx-test-runner.md
.\Install-Toolkit.ps1 -Rule jois-git-commit-hygiene.md -Force
```

- The command checks for each agent in `~/.claude/agents/` and in the project's `.claude/agents/`.
- If `opsx-task-applier` is in neither, the command says so, names `Install-Toolkit.ps1` and stops.
- If `opsx-test-runner` is in neither, the command says so, names `Install-Toolkit.ps1` and carries on: that group falls back to the confirmation word.
- The command never copies an agent itself.
- Re-install the rule and the test runner for the commit exception to take effect.
  - An older installed rule still says "never commit" next to the new command.
  - `-Force` overwrites the installed rule, which `-List` shows as `differs`.

#### Committing a group

- The purpose is to commit a checked group without a stop, and to ask only when something is doubtful.
- It commits by itself only when all of these hold:
  - The branch is a named branch other than `main` or `master`.
  - `opsx-test-runner` ran the tests for the group's files and every reported command shows exit code 0 (a passing command that shows no code is reported as `exit code 0 (the tool showed no error)`).
  - Nothing foreign is staged or edited. The change folder `openspec/changes/<name>/` is ignored in this check and never staged, because it is committed at archive.
  - No single file holds two concerns.
- The command judges the tests by exit codes, never by the agent's wording.
- A fixable doubt gets one rerun before it asks.
  - A fixable doubt is a missing exit code or a suite skipped for a folder problem.
  - The rerun puts the exact commands in the prompt, once per group, and the stall watch covers it.
  - A protected branch, a missing agent and an unrelated change are not rerun and go to the confirmation word.
  - A non-zero exit code is not rerun either. If a pending task of a later group is named as the fix, the commit waits. Otherwise it starts the fix loop. Both are described in [Fixing failures](#fixing-failures).
- A group of several concerns is split, not stopped on.
  - It is cut by the hygiene rule's one-concern list and by task.
  - The tests run once for the whole group before the first commit.
  - Each concern is staged by explicit path and committed in turn with its own message, and each hash is printed.
  - If a later commit fails, it stops and reports which commits were made.
- A commit-stop line in the project's `operationGuidance` does not govern these commits.
- Otherwise it stages the group, shows the summary and message, names a confirmation word and ends its turn, as the `jois-git-commit-hygiene` rule says.
  - The confirmation word comes only after every failure of the group is explained.
  - A detached HEAD or an unreadable branch name counts as protected.
  - No test command, a suite that could not run or a missing agent also send it to the confirmation word.
- It stages by explicit path and never uses `--amend` or `--no-verify`.
- It never pushes, on any branch.
- A rejected commit stops the command and is reported.

#### What the agent does

- It works through the group's tasks in order.
- It stops at the first task that is blocked or failed, so no later task is built on it.
- For each task its report lists:
  - the changed files
  - each command with the result and counts its output showed
  - the manual checks
  - what it could not verify
  - the requirement or scenario of the change's specs the task satisfies
  - one `result:` clause labeled with the task number
  - a `Failures` part, when a command failed: for each failure the command, the exact output line, the cause and whether it is fixed
- The command copies each clause verbatim into the task's line in `tasks.md` and ticks the box.
- `/jois-git:write-pr` already reads that clause for Author Verification.
- The agent never edits `tasks.md`.
- When a task needs a decision it cannot make, or would narrow a requirement of the specs, it ends with `blocked: <question>`.
- The command then asks you.

#### Fixing failures

- The purpose is to find and fix a failure before the next group starts, without asking you first.
- A failure is a task the report calls failed, a test command with a non-zero exit code, or a failure the report does not explain.
- The command sends a fresh `opsx-task-applier` with the failing command, its exact output and the instruction to find the cause and fix it.
- After each round it reruns the tests.
- A failure is explained only when the `Failures` part gives the command, the exact output line, the cause and whether it is fixed.
  - "Not caused by this group" counts only with evidence, such as the same failure on `main`.
- The command takes the next group only when every failure is explained.
- At most two fix rounds run.

A failing test does not always need a fix round now. Sometimes a later task of the same change is what makes the test pass, so the command holds the commit back and goes on.

- A failure is deferrable only when it is explained and also names, as its fix, a task that is still pending in a later group.
  - The failure gives the command, the exact output line, the cause and the task number.
  - The command checks the named task in `tasks.md` itself. The task must exist, sit in a later group and be unticked.
  - "A later group will fix it" with no task named is not deferrable, and neither is a task that is ticked or missing.
- For a deferrable failure the command does not commit, says which task it waits for, and takes the next group without asking you.
- After each later group it reruns the tests.
  - While every failure still names a pending task, it keeps holding.
  - When every command exits 0, it commits all held-back changes by explicit path, cut into commits by concern as the `jois-git-commit-hygiene` rule says.
  - Held-back groups that changed the same file keep that file in one commit.
  - It never commits while any command is red.
- The last group cannot defer, because no later task is left to fix anything. A red result there runs the fix loop over the whole change, and the command asks you if a failure stays unexplained.
- The command asks you in three cases, says which one applies and shows the failure:
  - The agent ends with `blocked: <question>`.
  - A second round ends with a failure still unexplained.
  - The same failure (same command and output line) comes back after a round meant to fix it.

#### What is enforced

- This is advisory, not enforced.
- Plain `/opsx:apply` is unchanged.
- Nothing stops a session that runs it from implementing the tasks itself.
- Inside the agent, three things are enforced: its tool list, its turn limit (`maxTurns`, 50) and two hooks.
- The hooks block `git commit`, `git push`, `gh`, a recursive and forced `rm` and an edit of a change's `tasks.md`.
- The `rm` block covers `-rf`, `-fr`, `-r -f` and `--recursive --force`, in any mix of short and long flags.
- A blocked `rm` fails at once with a message that the cleanup is left for the main session.
  - Without the block, the call waits on a permission prompt nobody sees.
  - The toolkit adds no allow rule for `rm`.
- The agent's instructions also ask for one plain command per Bash call: no chained `cd`, absolute paths only.
- The hooks look at the direct command, so a `gh` call hidden inside a script is not caught.
- The `rm` hook reads only the direct command, so an `rm -rf` hidden inside a script is not caught.
- The commit checks are the backstop.
- Groups run one at a time, never in parallel, because the agents share one checkout.

## Docs setup

`/jois-init:docs` sets up a docs process in the project it runs in. The pages live in the repo, are
checked for drift on every pull request and are copied one way to the GitHub wiki.

It needs the `jois-init-docs-templates` skill folder, which holds every file it writes. Install it with
`.\Install-Toolkit.ps1 -Skill jois-init-docs-templates`, in the project or in `~/.claude`. If neither has it,
the command says so, names `Install-Toolkit.ps1` and writes nothing.

The command first checks the project (a git repo, a GitHub remote, `wiki/`, a root `CLAUDE.md`,
`openspec/config.yaml`) and reports what it found. It then asks about each write on its own yes/no
question, and a no skips only that write.

### What it writes

- `scripts/check_docs.py` and `scripts/build_wiki.py`: the checker and the builder, plain Python with no install step.
- `scripts/tests/test_check_docs.py` and `scripts/tests/test_build_wiki.py`: their tests.
- `.github/workflows/docs-check.yml`: runs the checker on every pull request.
- `.github/workflows/wiki-publish.yml`: publishes the pages to the wiki.
- One checklist line in `.github/pull_request_template.md`, created when the template is missing.
- A starter `wiki/Home.md` and `wiki/_Sidebar.md`, each written only when missing and edited by hand from then on.
- An optional routing-table section in `CLAUDE.md` files.
- When `openspec/config.yaml` exists, optional archive guidance that tells the archiver to update the affected page first.
  The `jois-init:opsx` blocks are not touched.

It ends with a one-line report, each part marked `added`, `replaced`, `unchanged` or `skipped`.

### The nested layout

- Pages sit in topic folders under `wiki/` at the repo root, for example `wiki/architecture/billing/refunds.md`.
- A project on the old layout runs `git mv docs/wiki wiki` and re-runs the command.
- `Home.md` and `_Sidebar.md` are both hand-written and carry no markers, so a re-run never changes them.
- The checker keeps the sidebar complete: it fails on a page not linked once from `_Sidebar.md`, a page linked twice, a sidebar link that does not resolve and a sidebar link to `Home.md`.
- It also fails on a broken relative link, a page not linked from `Home.md`, a `CLAUDE.md` link into `wiki/` that names no file, a missing path in inline code and an oversized `CLAUDE.md`.
- The sidebar lists pages in the order you write them, so it can follow a reading order. Nothing generates it.
- A non-markdown file under `wiki/` also fails, because the wiki would not publish it.
- The GitHub wiki is flat, so the builder joins folders with `-`: that page becomes `architecture-billing-refunds`.
- The builder rewrites links to match and keeps anchors. Two pages with the same flat name make it fail.
- Renaming or moving a page changes its wiki URL.
- The nested pages sit directly in `wiki/`. The flat output is built only in a temporary folder.

### One-time wiki setup

The command cannot do these. It states them after it adds the publish workflow.

- Enable the wiki in the repo (Settings, Features, Wikis).
- Create one first wiki page in the web interface, because git cannot clone an empty wiki.
- Set Actions workflow permission to read and write (Settings, Actions, General, Workflow permissions).

### The overwrite rule

- Publishing is one way, from `wiki/` to the wiki. Nothing syncs back.
- Each publish deletes every wiki page that is not in `wiki/`.
- Before it overwrites, the workflow warns about wiki commits not made by the Actions bot. It then publishes anyway.
- Edit pages in the repo, never in the wiki.

### Re-running

- Every managed block sits between `jois-init:docs begin` and `jois-init:docs end` markers.
- A re-run replaces the block in place and never adds a second copy. Text outside the markers is kept.
- A hand edit between the markers is overwritten.
- A file that has no markers and differs from the template is shown as a diff and needs a yes before it changes. The two starter wiki pages are the exception: they are never changed once they exist.

### What is unchecked

- The first real publish to a GitHub wiki is unchecked. The workflow runs only on GitHub, and this repo's tests cover the builder offline.

## Rules

Each `.md` file directly under `toolkit/rules/` is one rule: a short instruction file Claude Code
loads on its own, with no one needing to invoke it. A rule with no `paths:` frontmatter loads at
session start, in every project. A rule with `paths:` frontmatter (a list of globs such as
`"**/*.java"`) loads once a matching file is read or created. Tested on Claude Code 2.1.299: a
scoped rule is not present before any matching file is touched, so a change planned before any
file is opened has no rules yet. Every coding rule here is scoped, so sessions that never touch
code (tickets, workflows) load none of them. Five rules are unscoped on purpose:

- `jois-git-commit-hygiene`: commits of images, deletions, renames and docs touch no code file, so a
  scoped rule would be missing exactly when those commits grow. It asks nothing unless Claude is
  about to commit.
- `jois-test-mock-data`: verification such as a `git push`, a deploy or a request to the user for
  data touches no code file either. It asks nothing unless Claude is about to test or verify a
  change.
- `jois-comms-replies`: replies happen in every session, whatever files are touched. It loads on
  every turn, so it is kept to about 20 lines.
  - It covers plain words, a clear reply shape, when to decide and when to ask, and how to ask.
- `jois-env-local-installs`: installing a package, such as `pip install` or `npm install -g`, touches
  no code file, so a scoped rule would be missing exactly when it matters. It asks nothing unless
  Claude is about to install something.
- `jois-env-stay-in-repo`: the files Claude creates for its own work and the places it reads and
  writes apply before any code file is touched, so a scoped rule would load too late.
  - It keeps mock repos, mock data, scratch files and agent progress notes under `.scratch/`.

`jois-comms-documents` is scoped to `**/*.md`: it loads when a markdown file is read or created, and
not in sessions that never touch markdown. It covers headers, bullets only for parallel items with
reasoning written as a paragraph, and owners and dates on next steps.

How the standards are split:

- Three core rules: principles, architecture boundaries and code quality, scoped to source-code file types.
- One path-scoped rule per technology: TypeScript/React, Java, Python, config files and scripts.
- Scoped rules have no size limit. They are written to be read, not squeezed.
- The unscoped `jois-git-commit-hygiene` rule keeps commits to one concern and requires the user's confirmation word before Claude commits.
  - One exception: `/jois-code:apply` may commit a finished group on a branch other than `main` or `master`.
  - Re-install the rule with `Install-Toolkit.ps1` for the exception to take effect.
- The unscoped `jois-test-mock-data` rule makes Claude test and verify with mock data and mock systems by default.
  - It never uses real systems or real data unless the user asks in the current request.
- The unscoped `jois-env-local-installs` rule lets Claude install packages only inside the project, such as through a project `.venv`.
  - It never installs globally and asks the user when no project-local way exists.
- The unscoped `jois-env-stay-in-repo` rule keeps every file Claude creates for its own work under `.scratch/` in the project.
  - It never reads or writes outside the project, and never reads subagent transcripts.
  - Each worktree has its own `.scratch/`, and the folder is git-ignored.
- Use `-Scope project` to keep the rules out of unrelated projects.
- A project's own `CLAUDE.md` takes precedence.

## Agents

Each `.md` file directly under `toolkit/agents/` is one Claude Code agent: a file with `name`,
`description` and `tools` frontmatter (an agent without `tools` inherits every tool, so
`python check_toolkit.py` fails on one), then the instructions. The installer treats each file as a
unit, so `-Agent opsx-task-applier.md` installs one. The toolkit ships two agents; other agents in
`~/.claude/agents/` are not the toolkit's and are never touched.

- `opsx-task-applier` does one group of an OpenSpec change's tasks (see [The task agent](#the-task-agent)).
- `opsx-test-runner` runs the project's own test commands for a group's files and reports each command, exit code and counts.
  - It uses the Haiku model and has no edit tools.
  - It installs nothing and never commits, pushes or calls GitHub.
  - It runs a suite in another folder with the command's own folder flag (`npm --prefix`, `git -C`), never `cd`.
  - A passing command whose result shows no exit code and no error is reported as `exit code 0 (the tool showed no error)`.
  - A failing command is reported with its exit code and error line.
  - Install it with `.\Install-Toolkit.ps1 -Agent opsx-test-runner.md`.

## Versions

Every skill, rule, agent and `jois-git`, `jois-init`, `jois-code`, `jois-docs` and `jois-story` command declares its version in a `metadata:` map in its
frontmatter, as the Agent Skills format keeps it. Both keys are strings and are bumped by hand
whenever the item's guidance changes: `version` is semver (`MAJOR.MINOR.PATCH`) and `last_updated`
is the date of the change.

```yaml
---
name: jois-git-example
description: ...
metadata:
  version: "1.0.0"
  last_updated: "2026-10-14"
---
```

A rule's frontmatter holds the same `metadata:` block next to its `paths:`; an unscoped rule such
as `jois-git-commit-hygiene`, `jois-test-mock-data`, `jois-env-local-installs` or `jois-env-stay-in-repo` has only the `metadata:` block and still loads in every session. A top-level
`version:` key is not accepted. `python check_toolkit.py` (run from `toolkit/`) fails on a missing or
malformed version.

`-List` shows each item's version and date, and for an item that differs it shows both the
toolkit's and the installed version, so you can see at a glance that an installed copy is behind.
The version says what changed and when; the content hash decides whether anything changed at all,
so an edit that forgot to bump the version still shows as `differs`.

`install/Get-ItemHash.ps1` is the one place the hash and the version are
computed. The installer dot-sources it, and you can run it on any skill folder, command folder or
`.md` file (it needs Windows PowerShell):

```powershell
.\toolkit\install\Get-ItemHash.ps1 -ItemPath ~\.claude\rules\jois-code-python.md
```

## Checks

`check_toolkit.py` verifies the toolkit against its own standards: rule scoping, versions, the `disable-model-invocation` flag, the write-pr/update-pr shared sections, a `tools` list on every agent, and, for skills that carry scripts, a lock file beside each `package.json` and no import outside the skill folder. It
uses only the Python standard library; only the tests need a package (`pytest`, listed in
`requirements.txt`). Set up a virtual environment once, then run both from this folder:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python check_toolkit.py
python -m pytest        # tests/ covers the checker
```

`.venv/` ignores itself, so it stays out of git.

## Specs and history

The root `openspec/` holds the OpenSpec specs for the toolkit's skills, commands, rules and agents (`toolkit-*`,
`jois-stage`), and the changes that shaped them, next to the planner's. It is documentation only: the installer never copies it. The `/opsx:*` commands need the
`openspec` CLI, and the `jois-git` commands need `git` and `gh` (`/jois-git:write-issue` also uses `glab` on GitLab repos).

## Installing by hand

Copy into the folder your tool reads from:

| Tool | Scope | Skills | Commands | Rules | Agents |
|---|---|---|---|---|---|
| Claude Code | Global | `~/.claude/skills/<name>/` | `~/.claude/commands/<entry>` | `~/.claude/rules/<name>.md` | `~/.claude/agents/<name>.md` |
| Claude Code | Per project | `<project>/.claude/skills/<name>/` | `<project>/.claude/commands/<entry>` | `<project>/.claude/rules/<name>.md` | `<project>/.claude/agents/<name>.md` |

Examples:

- Windows: copy `toolkit\rules\jois-code-python.md` to `%USERPROFILE%\.claude\rules\jois-code-python.md`.
- macOS and Linux: `cp -r toolkit/commands/jois-git ~/.claude/commands/`.

Where each tool reads these from is data in `install/targets.json`, so supporting another tool is a
new entry there.
