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
.\Install-Toolkit.ps1 -Agent opsx-task-applier.md             # just one agent
.\Install-Toolkit.ps1 -Scope project -Path C:\code\my-app     # into a project instead of globally
.\Install-Toolkit.ps1 -Force                                  # overwrite a copy that differs
.\Install-Toolkit.ps1 -NoPackages                             # skip `npm ci` for skills with a package.json
.\Install-Toolkit.ps1 -Uninstall                              # remove toolkit items, and only those
```

Passing `-Skill`, `-Command`, `-Rule` or `-Agent` limits the run to those items. An installed item that differs from the toolkit's copy is never overwritten unless you pass `-Force`, and `-List` shows it as `differs`. The script writes only inside the skills, commands, rules and agents folders, so it never touches `settings.json` or hooks. Uninstall removes only items the toolkit holds, so other agents in `~/.claude/agents/` stay.

Use `-Scope project` to keep the rules out of unrelated projects. A project's own `CLAUDE.md` takes precedence over an installed rule.

### Skills that carry scripts

A skill is a folder, so it may hold scripts, a `lib/` folder, a `references/` folder and a `package.json`. Two rules keep it installable on its own. A script imports only files inside its own skill folder, and `python toolkit/check_toolkit.py` fails on an import that leaves it. A `package.json` needs a `package-lock.json` beside it, so the install is repeatable.

The installer runs `npm ci` in the installed skill folder when it installs or replaces such a skill, and not for a skill that is `up to date`. `-NoPackages` skips that step and prints the folder and the command to run by hand. If `npm` is missing or `npm ci` fails, the skill's files stay installed, the other items continue and the exit code is 1. The `node_modules` folder is left out of the content hash, so a skill with installed packages still counts as `up to date`. `-Force` replaces the whole folder and reinstalls, and `-Uninstall` removes the whole folder, `node_modules` included.

### Node version for the story skills

The story skills need Node 20.19 or later, or Node 22.7 or later. Their `lib/*.js` files use ES module syntax and no `package.json` marks them as modules. Node loads such a file as a module only through syntax detection, which is on by default from those versions.

Unchecked: these two version numbers come from memory of the Node release notes and were not confirmed against the Node docs. The tests were run only on Node 24.19.0.

### Where the story skills find their data

The story skills read a data folder that the planner also uses. How they find it is on [Story Skills Internals](../planner/architecture/Story-Skills-Internals.md).

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
