## 1. Installer and docs check

- [x] 1.1 Add an `agents` entry (`~/.claude/agents`, `.claude/agents`) to `toolkit/install/targets.json` and verify the file still parses as JSON with `python -c "import json; json.load(open('toolkit/install/targets.json'))"`
- [x] 1.2 Add agent items and an `-Agent` parameter to `toolkit/install/Install-Toolkit.ps1` (list, install, no-overwrite, uninstall, unknown-name error, missing `toolkit/agents/` tolerated), update its help text, and verify with a project-scope install into a temp folder that `.claude/agents/<file>` appears, `-List` shows it, `-Uninstall` removes only it, and a foreign agent file next to it is untouched
- [x] 1.3 Add a check to `toolkit/check_toolkit.py` that every `toolkit/agents/*.md` has a `tools` frontmatter field, update its docstring, add tests to `toolkit/tests/test_check_toolkit.py` (agent without `tools` fails and names the file; agent with `tools` passes), and verify with `cd toolkit; python check_toolkit.py; python -m pytest`

## 2. The task agent

- [x] 2.1 Write `toolkit/agents/opsx-task-applier.md`: frontmatter (`name`, `description`, `tools: Read, Grep, Glob, Edit, Write, Bash`, `maxTurns`, `metadata.version`, `metadata.last_updated`), the `Bash` hook that blocks `git commit`, `git push` and `gh`, the `Edit|Write` hook that blocks a change's `tasks.md`, and a body that gives the one-task scope, the report shape (changed files, commands with observed results and counts, manual checks, unverified items, one ready-to-paste `result:` clause), the `blocked: <question>` outcome and the never-commit, never-edit-`/opsx:*` rules; verify `python check_toolkit.py` passes
- [x] 2.2 Check each hook command in the agent file by piping sample tool-input JSON to it from PowerShell, and verify `git commit -m x`, `git push`, `gh pr list` and an Edit of `openspec/changes/x/tasks.md` exit 2 with a message, while `git status`, `npm test` and an Edit of `toolkit/README.md` exit 0

## 3. Apply guidance

- [x] 3.1 Add the delegation line to the `operations.apply.guidance` block in `toolkit/commands/jois-init/opsx.md` (one task at a time to `opsx-task-applier`, announce before each dispatch with task, files, labeled estimate, no live timer, how to open the transcript and the turn limit, one line after each report, copy the `result:` clause verbatim into `tasks.md`), add a step that notes whether the agent is installed and names `Install-Toolkit.ps1` when it is not, bump `metadata.version` and `last_updated`, and verify `python check_toolkit.py` passes and the command still says the apply block holds the commit-stop line and the new line
- [x] 3.2 Replace the managed `operations.apply` block in this repository's `openspec/config.yaml` with the text from 3.1 (between its markers only) and verify with `git diff openspec/config.yaml` that nothing outside the markers changed and `openspec list` still runs

## 4. Docs

- [x] 4.1 Update `toolkit/README.md` (what the toolkit holds, quick start, manual-install folders, the agent and its guidance line, the "advisory, not enforced" caveat) and verify every folder and parameter it names matches `targets.json` and `Install-Toolkit.ps1`
- [x] 4.2 Run `openspec validate add-opsx-task-agent --strict` and `cd toolkit; python check_toolkit.py; python -m pytest`, and verify both pass
