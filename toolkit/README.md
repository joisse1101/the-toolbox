# Toolkit

Reusable AI-agent skills, slash commands, rules and agents, kept in one place so they have version history
and can be put on any machine or project. Nothing here depends on a vendor's plugin marketplace: a skill,
command, rule or agent is just files, and the script below only automates copying them.

Claude Code is the only supported tool today.

The full guide is in the wiki, starting at the [Toolkit Guide](../wiki/toolkit/Toolkit-Guide.md). This file holds the quick start and the manual install.

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
.\Install-Toolkit.ps1 -Agent task-applier.md             # just one agent
.\Install-Toolkit.ps1 -Scope project -Path C:\code\my-app     # into a project instead of globally
.\Install-Toolkit.ps1 -Force                                  # overwrite a copy that differs
.\Install-Toolkit.ps1 -NoPackages                            # skip `npm ci` for skills with a package.json
.\Install-Toolkit.ps1 -NoSettings                            # leave settings.json alone
.\Install-Toolkit.ps1 -SubagentModel Overwrite               # replace a different CLAUDE_CODE_SUBAGENT_MODEL (or Skip)
.\Install-Toolkit.ps1 -Uninstall                              # remove toolkit items (only those)
```

Passing `-Skill`, `-Command`, `-Rule` and/or `-Agent` limits the run to those items. An item already
installed that differs from the toolkit's copy is never overwritten unless you pass `-Force`; `-List`
shows it as `differs`. The script writes only inside the skills, commands, rules and agents folders,
plus one key in `settings.json`: on a full install it sets `CLAUDE_CODE_SUBAGENT_MODEL` to `sonnet` in
the `env` object, after saving a backup, and asks before replacing a different value (see
[Install](../wiki/toolkit/Install.md)). It never touches hooks. Uninstall removes only items the toolkit holds, so the other
agents in `~/.claude/agents/` stay.

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

By hand, the subagent default is one line in `settings.json`: `"env": { "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet" }`.

## Where the rest is

Each topic that used to be explained here is on a wiki page.

| Topic | Page |
| --- | --- |
| Skills that carry scripts, the `npm ci` step and the Node version for the story skills | [Install](../wiki/toolkit/Install.md) |
| Where the story skills find their data | [Story Skills Internals](../wiki/planner/architecture/Story-Skills-Internals.md) |
| Naming, the domains and the migration from the old names | [Toolkit Guide](../wiki/toolkit/Toolkit-Guide.md) and [Install](../wiki/toolkit/Install.md) |
| Every skill, command, rule and agent | [Toolkit Guide](../wiki/toolkit/Toolkit-Guide.md) |
| The design skill and the `jois-git`, `jois-code` and `jois-docs` commands in detail | [Command Details](../wiki/toolkit/Command-Details.md) |
| OpenSpec setup, the task agent, committing a group, failure rounds and what is enforced | [Task Agent](../wiki/toolkit/Task-Agent.md) |
| Docs setup (`/jois-init:docs`) | [Docs Setup](../wiki/toolkit/Docs-Setup.md) |
| The rules and when each loads | [Rules](../wiki/toolkit/Rules.md) |
| Versions and `Get-ItemHash.ps1` | [Install](../wiki/toolkit/Install.md) |
| Checks (`check_toolkit.py` and the tests) and the specs | [Install](../wiki/toolkit/Install.md) |
| Which items to run for a job | [Task Recipes](../wiki/toolkit/Task-Recipes.md) |
