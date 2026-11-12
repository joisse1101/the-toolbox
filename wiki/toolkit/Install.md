# Install

This page shows how to put the toolkit's skills, commands, rules and agents on a machine or into a project, and how their versions work. Claude Code is the only supported tool today. Nothing depends on a vendor's plugin marketplace: an item is just files, and the installer script only automates copying them.

## Quick start

Copy the `toolkit/` folder onto the machine, then run the installer in Windows PowerShell:

```powershell
cd toolkit\install
.\Install-Toolkit.ps1
```

Start a new Claude Code session afterwards. The skills, commands, rules and agents are then available everywhere on that machine. The installer is `toolkit/install/Install-Toolkit.ps1`.

### Install options

Each option limits or changes what the script does:

```powershell
.\Install-Toolkit.ps1 -List                                   # what is installed, has it drifted, which versions
.\Install-Toolkit.ps1 -Command jois-git                       # just one command folder
.\Install-Toolkit.ps1 -Rule jois-code-java.md                 # just one rule
.\Install-Toolkit.ps1 -Agent task-applier.md             # just one agent
.\Install-Toolkit.ps1 -Scope project -Path C:\code\my-app     # into a project instead of globally
.\Install-Toolkit.ps1 -Force                                  # overwrite a copy that differs
.\Install-Toolkit.ps1 -NoPackages                             # skip `npm ci` for skills with a package.json
.\Install-Toolkit.ps1 -NoSettings                             # leave settings.json alone
.\Install-Toolkit.ps1 -SubagentModel Overwrite                # replace a different CLAUDE_CODE_SUBAGENT_MODEL (or Skip)
.\Install-Toolkit.ps1 -Uninstall                              # remove toolkit items, and only those
```

Passing `-Skill`, `-Command`, `-Rule` or `-Agent` limits the run to those items. An installed item that differs from the toolkit's copy is never overwritten unless you pass `-Force`, and `-List` shows it as `differs`. The script writes only inside the skills, commands, rules and agents folders, except for the one `settings.json` key described below. It never touches hooks or any other setting. Uninstall removes only items the toolkit holds, so other agents in `~/.claude/agents/` stay.

`-Target <name>` picks another tool's entry in `toolkit/install/targets.json` (the default is `claude-code`), and `-Help` (or `-h`) prints the script's help.

Use `-Scope project` to keep the rules out of unrelated projects. A project's own `CLAUDE.md` takes precedence over an installed rule.

### The default subagent model

A subagent is a helper session that Claude starts to do delegated work. On a full install (no `-Skill`, `-Command`, `-Rule` or `-Agent`), the installer ends by setting `CLAUDE_CODE_SUBAGENT_MODEL` to `sonnet` in the `env` object of Claude Code's `settings.json`: `~/.claude/settings.json` for a global install and `<project>/.claude/settings.json` for a project install. Claude Code uses that value for a subagent that has no model passed on its call and none pinned in its agent file. Naming an item never reaches the settings file.

The installer creates the file or the `env` object when they are missing and keeps every other key. It parses the file as JSON and writes it back, so the file's whitespace changes, and in Windows PowerShell 5.1 characters such as `'` and `&` come back as `\uXXXX` escapes. Claude Code reads both forms the same way. Before it changes an existing file, the installer saves a copy beside it as `settings.json.bak-<time>`. A file that is not valid JSON is left unchanged, the installer names it, and the exit code is 1. When the value is already `sonnet`, nothing is written.

When the key already holds another value, the installer shows that value and asks. Overwriting replaces it, so a subagent with no model passed or pinned runs on Sonnet. Skipping keeps it, so such a subagent keeps its current default. Two parameters answer without a prompt:

- `-SubagentModel Overwrite` or `-SubagentModel Skip` gives the answer in advance.
- `-NoSettings` skips the whole step, for `-List` and `-Uninstall` too.

With nobody to ask, such as a run with no console input, the installer skips, prints a warning that names the current value and exits 0. `-List` prints the key's state (`missing`, `up to date` or `differs`). `-Uninstall` leaves `settings.json` unchanged and names the key, because the installer cannot tell its own `sonnet` from one you chose, so you remove the line by hand.

Only the default variable is set. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` would make the variable win over the model pinned in an agent file, which would move `test-runner` off Haiku, so the installer never sets it. A call that passes `opus` explicitly still gets Opus, and only the `jois-env-subagents` rule discourages it.

### Skills that carry scripts

A skill is a folder, so it may hold scripts, a `lib/` folder, a `references/` folder and a `package.json`. Two rules keep it installable on its own. A script imports only files inside its own skill folder, and `python toolkit/check_toolkit.py` fails on an import that leaves it. A `package.json` needs a `package-lock.json` beside it, so the install is repeatable.

The installer runs `npm ci` in the installed skill folder when it installs or replaces such a skill, and not for a skill that is `up to date`. `-NoPackages` skips that step and prints the folder and the command to run by hand. If `npm` is missing or `npm ci` fails, the skill's files stay installed, the other items continue and the exit code is 1. The `node_modules` folder is left out of the content hash, so a skill with installed packages still counts as `up to date`. `-Force` replaces the whole folder and reinstalls, and `-Uninstall` removes the whole folder, `node_modules` included.

### Node version for the story skills

The story skills need Node 20.19 or later, or Node 22.7 or later. Their `lib/*.js` files use ES module syntax and no `package.json` marks them as modules. Node loads such a file as a module only through syntax detection, which is on by default from those versions.

Unchecked: these two version numbers come from memory of the Node release notes and were not confirmed against the Node docs. The tests were run only on Node 24.19.0.

### Where the story skills find their data

The story skills read a data folder that the planner also uses. How they find it is on [Story Skills Internals](../planner/architecture/Story-Skills-Internals.md).

## Migrating from the old names

Before the `jois-<domain>-<thing>` naming the items were `coding-standards`, `/jois:*` and unprefixed rules. A machine that has them installed keeps them, and the installer no longer manages them, so a rule would load twice once the new copy is installed. Remove the old items first:

- The skill `~/.claude/skills/coding-standards`.
- The command folder `~/.claude/commands/jois`.
- These rules in `~/.claude/rules`: `commit-hygiene.md`, `test-mock-data.md`, `core-principles.md`, `architecture-boundaries.md`, `java.md`, `python.md`, `typescript-react.md`, `config-files.md` and `scripts.md`.

Then run `.\Install-Toolkit.ps1` again (or with `-Scope project -Path <project>`) and check that `-List` shows every item `up to date`. In a project, remove the same names from `<project>\.claude`. Project `CLAUDE.md` files and notes that mention `/jois:stage` and the like need updating by hand.

The `jois-code-standards` skill is now the `jois-code-quality` rule, which loads while code is written instead of on request. Delete `~/.claude/skills/jois-code-standards` (in a project, `<project>\.claude\skills\jois-code-standards`), then run `.\Install-Toolkit.ps1` to add the rule. For a review, use the built-in `code-review` or `simplify` skills.

### The renamed task agents

The agents `opsx-task-applier` and `opsx-test-runner` are now `task-applier` and `test-runner`, so that `/jois-code:apply` and `/opsx:apply` can share them. The installer deletes nothing, so after you install the new files (`.\Install-Toolkit.ps1 -Agent task-applier.md` and `-Agent test-runner.md`), delete `opsx-task-applier.md` and `opsx-test-runner.md` by hand from `~/.claude/agents/` and from any project's `.claude/agents/`. Until then `/jois-code:apply` treats a machine with only the old files as not having the agents. Then run `/jois-init:opsx` in each project to replace the apply guidance. <!-- docs-check: ignore -->

## Installing by hand

Copy into the folder your tool reads from. For Claude Code the folders are:

| Scope | Skills | Commands | Rules | Agents |
| --- | --- | --- | --- | --- |
| Global | `~/.claude/skills/<name>/` | `~/.claude/commands/<entry>` | `~/.claude/rules/<name>.md` | `~/.claude/agents/<name>.md` |
| Per project | `<project>/.claude/skills/<name>/` | `<project>/.claude/commands/<entry>` | `<project>/.claude/rules/<name>.md` | `<project>/.claude/agents/<name>.md` |

Two examples:

- Windows: copy `toolkit\rules\jois-code-python.md` to `%USERPROFILE%\.claude\rules\jois-code-python.md`.
- macOS and Linux: run `cp -r toolkit/commands/jois-git ~/.claude/commands/`.

Where each tool reads these from is data in `toolkit/install/targets.json`, so supporting another tool is a new entry there.

## Versions

Every skill, rule, agent and command declares its version in a `metadata:` map in its frontmatter, the block of settings at the top of the file. Both keys are strings, and you bump them by hand whenever the item's guidance changes. The `version` key is semantic versioning (`MAJOR.MINOR.PATCH`) and `last_updated` is the date of the change.

```yaml
---
name: jois-git-example
description: ...
metadata:
  version: "1.0.0"
  last_updated: "2026-10-14"
---
```

A rule's frontmatter holds the same `metadata:` block next to its `paths:` list. An unscoped rule has only the `metadata:` block and still loads in every session. A top-level `version:` key is not accepted, and `python toolkit/check_toolkit.py` fails on a missing or malformed version.

`-List` shows each item's version and date. For an item that differs it shows both the toolkit's and the installed version, so you can see at a glance that an installed copy is behind. The version says what changed and when. The content hash decides whether anything changed at all, so an edit that forgot to bump the version still shows as `differs`.

`toolkit/install/Get-ItemHash.ps1` is the one place the hash and the version are computed. The installer runs it, and you can run it on any skill folder, command folder or `.md` file in Windows PowerShell:

```powershell
.\toolkit\install\Get-ItemHash.ps1 -ItemPath ~\.claude\rules\jois-code-python.md
```

## Checks

`toolkit/check_toolkit.py` verifies the toolkit against its own standards: rule scoping, versions, the `disable-model-invocation` flag, the write-pr and update-pr shared sections, a `tools` list on every agent, and, for skills that carry scripts, a lock file beside each `package.json` and no import outside the skill folder. It uses only the Python standard library, and only the tests need a package (`pytest`, listed in `toolkit/requirements.txt`). Set up a virtual environment once, then run both from the `toolkit/` folder:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

python check_toolkit.py
python -m pytest        # tests/ covers the checker
```

The `.venv/` folder ignores itself, so it stays out of git. The story skills' own scripts have tests that run with `node --test toolkit/tests/story/*.test.mjs`, separate from these.

## Specs and history

The root `openspec/` holds the OpenSpec specs for the toolkit's skills, commands, rules and agents (`toolkit-*` and `jois-stage`), and the changes that shaped them, next to the planner's. It is documentation only, and the installer never copies it. The `/opsx:*` commands need the `openspec` CLI, and the `jois-git` commands need `git` and `gh` (`/jois-git:write-issue` also uses `glab` on GitLab repos).
