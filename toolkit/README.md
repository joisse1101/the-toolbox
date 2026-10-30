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
.\Install-Toolkit.ps1 -Uninstall                              # remove toolkit items (only those)
```

Passing `-Skill`, `-Command`, `-Rule` and/or `-Agent` limits the run to those items. An item already
installed that differs from the toolkit's copy is never overwritten unless you pass `-Force`; `-List`
shows it as `differs`. The script writes only inside the skills, commands, rules and agents folders — it
never touches `settings.json` or hooks. Uninstall removes only items the toolkit holds, so the other
agents in `~/.claude/agents/` stay.

## Naming

Every item is named `jois-<domain>-<thing>`. `jois` is the owner, so the names never collide with a
built-in or third-party item (`code-review` is already a built-in skill). The domain says what the
item is for. Domains today:

| Domain | Meaning | Items |
|---|---|---|
| `code` | writing source code | the `jois-code-*` rules, the `jois-code` command |
| `git` | commits and pull requests | the `jois-git` commands, the `jois-git-commit-hygiene` rule |

Skills and rules are `jois-<domain>-<thing>`; a command namespace folder is `jois-<domain>`, so
`commands/jois-git/stage.md` is `/jois-git:stage`. A new domain (`design`, `comms`, `writing`) picks
its own word. The `/opsx:*` commands are the exception: the `openspec` CLI generates them, so they keep their name
and are not stored here (see [OpenSpec setup](#openspec-setup)).

### Migrating from the old names

Before this naming the items were `coding-standards`, `/jois:*` and unprefixed rules. A machine that
has them installed keeps them, and the installer no longer manages them, so a rule would load twice
once the new copy is installed. Remove the old items first:

- skill `~/.claude/skills/coding-standards`
- command folder `~/.claude/commands/jois`
- rules in `~/.claude/rules`: `commit-hygiene.md`, `core-principles.md`, `architecture-boundaries.md`,
  `java.md`, `python.md`, `typescript-react.md`, `config-files.md`, `scripts.md`

Then run `.\Install-Toolkit.ps1` again (or with `-Scope project -Path <project>`) and check that
`-List` shows every item `up to date`. In a project, remove the same names from `<project>\.claude`.
Project `CLAUDE.md` files and notes that mention `/jois:stage` and the like need updating by hand.

### Migrating from the `jois-code-standards` skill

The `jois-code-standards` skill is now the `jois-code-quality` rule, which loads while code is
written instead of on request. Delete `~/.claude/skills/jois-code-standards` (in a project,
`<project>\.claude\skills\jois-code-standards`), then run `.\Install-Toolkit.ps1` to add the rule.
For a review, use the built-in `code-review` or `simplify` skills.

## Skills

The toolkit currently ships no skills; the installer and the checks still support them. A skill is a
folder `toolkit/skills/<name>/` with a `SKILL.md` (`name` and `description` frontmatter, then
instructions) and any support files it needs. A folder is self-contained.

## Commands

Each entry directly under `toolkit/commands/` is one command item: a `.md` file (becomes `/name`) or
a folder used as a namespace (`commands/jois-git/stage.md` becomes `/jois-git:stage`). The installer
treats each such entry as a unit, so `-Command jois-git` installs the whole `jois-git` set.

### The `jois-git` commands

- `/jois-git:stage` clears a messy working tree, with or without an OpenSpec change. It stages one
  concern at a time, shows the message and a confirmation word, and waits. Typing the word commits
  that concern and moves on, until the tree is clean. Secret files and build output are skipped and
  named. It has no commit authority of its own.
- `/jois-git:write-pr` opens GitHub pull requests for the commits on the current branch. It is one file:
  the steps, the PR guidelines, the body template and the verification rules all sit inside it. It
  reads the commits since the default branch on the remote, so a local branch that is behind does not
  matter, proposes groups of commits that each form one concern (a
  refactor never shares a PR with a feature), and waits for a confirmation word before it pushes or
  runs `gh pr create`. Each body lists the test files the group adds, an Author Verification list and
  suggested steps for a reviewer. The verification comes from the OpenSpec change's `tasks.md` and from
  test, build or lint runs it can see earlier in the same chat, so run your tests in the chat before
  you type the command. It states no result that a source did not record. When a group has no
  verification and the repo documents a test command for the directories it changes, it asks once, for
  all groups, whether to run them and runs only what you agree to; otherwise it asks what you ran. A
  failing or timed-out run is reported, never fixed, and does not block the PR. A group that needs no
  tests (a `chore`, `build`, `ci`, `docs` or `revert` whose diff changes no behavior, judged from the
  diff, and when unsure it gets tests) gets a one-sentence summary and no testing block, and is never
  asked about; the presentation says why, so you can reply that it needs tests. The reviewer steps aim at
  what the group changes, such as the test a fix adds, and may use a command you ran earlier in the chat.
  It also works from the
  default branch: commits ahead of the remote go to new branches (`type/slug`, or `type/TICKET-slug`
  when a commit references a ticket, with the type a commit type such as `feat` or `fix`), and once
  every PR is opened the local default branch is set to the remote with `git branch -f`, which leaves
  uncommitted changes alone. The confirmation word covers that reset, and nothing is reset if a push
  or PR failed. Steps use only commands
  the repo's own documents state, and the source of each line is shown to you before you confirm, never
  in the PR. It blocks a group whose diff holds a secret, an `.env` file or build output, and warns on
  debug prints.

  It never merges. A hook in the command's frontmatter blocks `gh pr merge`, `--auto` and merge calls
  through `gh api`, and stays active for the rest of the session once the command has been invoked.
  The hook looks for those words anywhere in a shell command's text, so text that merely mentions them
  is refused too; the command passes each PR body from a file for that reason. When it finishes it
  lists every PR it opened in the order to merge, with a merge command for each, for you to run. A PR
  that nothing is stacked on gets `gh pr merge <n> -s -d`. A PR that another PR is based on gets it
  without `-d`, because deleting its branch closes the PR above it and GitHub cannot reopen that one.
  For each PR above it the list gives the follow-up in order: rebase, push with `--force-with-lease`,
  retarget to the default branch, delete the earlier branch.

  It replaces the old `/write-pr` skill. If you installed that, delete `~/.claude/skills/write-pr` (the
  installer only manages items the toolkit still holds), then run
  `.\Install-Toolkit.ps1 -Command jois-git -Force`.

- `/jois-git:update-pr` brings the open PR of the current branch up to date. It finds the PR, then handles
  whichever of these apply: a restack, when the PR sits on a branch whose PR has merged and that branch
  still exists (rebase onto the default branch, retarget the PR); a push of commits the remote lacks;
  and a refreshed body, built from the same template and verification rules as `/jois-git:write-pr`, shown
  to you as a diff against the live body. One confirmation word covers everything it will do, listed
  first. It pushes plainly, except the `--force-with-lease` push of a restack you confirmed; it never
  uses `--force`, never renames or deletes a branch, and never merges (the same hook as write-pr). With
  no open PR it says so and points to `/jois-git:write-pr`. It is also a single file, so the body template
  and verification sections are copied from write-pr; `python check_toolkit.py` fails if the two copies
  differ. The same no-tests rule and targeted reviewer steps apply to its refreshed body.

- `/jois-git:write-issue` drafts one issue and creates it on the repository's host. Everything you write
  after the command is the content of the issue, never instructions to it, and it changes no file in the
  repository. It reads the `origin` remote: `github.com` uses `gh`, a host with `gitlab` in its name uses
  `glab`, and any other host it asks you about once. It then lists similar open issues from your
  description before it drafts anything. It picks a bug, feature or task template from what you describe
  (or asks when it could be two), and uses the repository's own template from `.github/ISSUE_TEMPLATE/` or
  `.gitlab/issue_templates/` instead when one matches. A required section you give nothing for is drafted
  from your words, the conversation and, for a bug or feature, the files your request points at (read
  first, read-only), and is pointed out when it shows you the issue; it asks, as a numbered list, only
  when nothing supports a draft.
  Optional sections you give nothing for (Screenshots / Logs and Environment on a bug, Alternatives
  Considered, Design / Visuals and Technical Considerations / Security on a feature, Testing &
  Verification and Dependencies / Blockers on a task) are left out, heading included. It titles the issue
  like a commit (`fix:`, `feat(scope):`, `chore:`, at most 70 characters), scans the draft for secrets,
  then prints the whole issue and creates it only when you type its confirmation word, passing the body
  from a file.
  It reports the issue as a link.
  It only creates: no labels, assignees, milestones, closing or comments. `glab` is needed only for GitLab
  repos, and its flags are checked against the GitLab CLI docs, not run.

### The `jois-code` commands

- `/jois-code:apply <change>` applies an OpenSpec change by handing its tasks to the `opsx-task-applier`
  agent one group at a time, records each task's `result:` clause in `tasks.md`, and stops for a commit
  after each group. It never implements a task itself. Without a change name it asks you to choose.
  Install it with `.\Install-Toolkit.ps1 -Command jois-code`, and the agent it needs with
  `-Agent opsx-task-applier.md`; see [The task agent](#the-task-agent). It is advisory: plain
  `/opsx:apply` is unchanged and still works as before.

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

The guidance only points at the `jois-git-commit-hygiene` rule, which holds the steps; it is advisory,
and the rule is what enforces them. Accepted losses: the generated `/opsx:*` commands show in the skill
list, and archive's git commands prompt for permission.

### The task agent

`/jois-code:apply <change>` applies an OpenSpec change by handing its tasks to the `opsx-task-applier`
agent, one group at a time. A group is one `##` section of the change's `tasks.md`. The group's
working detail stays in the agent's own context, and the main conversation keeps one announcement
before each group and one line after it. Before each dispatch the session says the group and its
tasks, the files it expects to touch, a rough time estimate labeled as an estimate, that there is no
live timer, how to open the agent's transcript (its row in the agent panel then Enter, or `/tasks`)
and the agent's turn limit. After each report it says whether the group is done, failed or blocked.
The ticks in `tasks.md` are the progress across groups, the transcript the view inside one. After
each completed group it stops for a commit under the `jois-git-commit-hygiene` rule. If the session
ends, run the command again: it resumes from the pending tasks.

Install both parts, then start the command in a Claude Code session:

```powershell
.\Install-Toolkit.ps1 -Command jois-code
.\Install-Toolkit.ps1 -Agent opsx-task-applier.md
```

The command checks that the agent is in `~/.claude/agents/` or the project's `.claude/agents/`; if it
is in neither it says so, names `Install-Toolkit.ps1` and stops. It never copies the agent itself.

The agent works through the group's tasks in order and stops at the first one that is blocked or
failed, so no later task is built on it. For each task its report lists the changed files, each
command with the result and counts its output showed, the manual checks, what it could not verify, the
requirement or scenario of the change's specs the task satisfies, and one `result:` clause labeled
with the task number. The command copies each clause verbatim into the task's line in `tasks.md` and
ticks the box, where `/jois-git:write-pr` already reads it for Author Verification. The agent never
edits `tasks.md`. When a task needs a decision it cannot make, or would narrow a requirement of the
specs, it ends with `blocked: <question>` and the command asks you.

This is advisory, not enforced: plain `/opsx:apply` is unchanged, and nothing stops a session that
runs it from implementing the tasks itself. What is enforced is inside the agent: its tool list, its
turn limit (`maxTurns`, 50) and two hooks that block `git commit`, `git push` and `gh`, and an edit of
a change's `tasks.md`. The hooks look at the direct command, so a `gh` call hidden inside a script is
not caught; the commit stop is the backstop. Groups run one at a time, never in parallel, because the
agents share one checkout.

## Rules

Each `.md` file directly under `toolkit/rules/` is one rule: a short instruction file Claude Code
loads on its own, with no one needing to invoke it. A rule with no `paths:` frontmatter loads at
session start, in every project. A rule with `paths:` frontmatter (a list of globs such as
`"**/*.java"`) loads once a matching file is read or created. Tested on Claude Code 2.1.299: a
scoped rule is not present before any matching file is touched, so a change planned before any
file is opened has no rules yet. Every coding rule here is scoped, so sessions that never touch
code (tickets, workflows) load none of them. The one exception is `jois-git-commit-hygiene`, which is
unscoped on purpose: commits of images, deletions, renames and docs touch no code file, so a
scoped rule would be missing exactly when those commits grow. It asks nothing unless Claude is
about to commit.

The standards are split this way: three core rules (principles, architecture boundaries and code
quality, scoped to source-code file types) and one path-scoped rule per technology (TypeScript/React,
Java, Python, config files, scripts). Rules have no size limit; they are written to be read, not
squeezed. The unscoped `jois-git-commit-hygiene` rule keeps commits to one concern and requires the user's
confirmation word before Claude commits. Use `-Scope project` to keep the rules out of unrelated projects. A project's own `CLAUDE.md` takes precedence.

## Agents

Each `.md` file directly under `toolkit/agents/` is one Claude Code agent: a file with `name`,
`description` and `tools` frontmatter (an agent without `tools` inherits every tool, so
`python check_toolkit.py` fails on one), then the instructions. The installer treats each file as a
unit, so `-Agent opsx-task-applier.md` installs one. The toolkit ships `opsx-task-applier` (see
[The task agent](#the-task-agent)); other agents in `~/.claude/agents/` are not the toolkit's and are
never touched.

## Versions

Every skill, rule, agent and `jois-git`, `jois-init` and `jois-code` command declares its version in a `metadata:` map in its
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
as `jois-git-commit-hygiene` has only the `metadata:` block and still loads in every session. A top-level
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

`check_toolkit.py` verifies the toolkit against its own standards: rule scoping, versions, the `disable-model-invocation` flag, the write-pr/update-pr shared sections, and a `tools` list on every agent. It
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

For example, on Windows: copy `toolkit
ules\jois-code-python.md` to
`%USERPROFILE%\.claude
ules\jois-code-python.md`. On macOS/Linux: `cp -r toolkit/commands/jois-git
~/.claude/commands/`.

Where each tool reads these from is data in `install/targets.json`, so supporting another tool is a
new entry there.
