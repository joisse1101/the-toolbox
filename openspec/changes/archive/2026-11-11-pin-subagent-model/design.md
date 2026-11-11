# Design

## Context

See proposal.md for the motivation. Three facts shape the approach.

- Claude Code picks a subagent's model in this order: the model passed on the call, the model in the agent's file, `CLAUDE_CODE_SUBAGENT_MODEL`, then the main session's model. A headless test on Claude Code 2.1.322 confirmed it: with the variable set to `sonnet`, a call with no model ran on Sonnet, an agent pinned to Haiku stayed on Haiku, and a call that passed `opus` got Opus.
- A second variable, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, makes the first win over the other two. That would move `opsx-test-runner` off Haiku.
- A context check with three subagents showed that `general-purpose` loads the user's global rules, the project `CLAUDE.md`, the memory index and the skills list. A custom agent without the `Skill` tool loads the first three and no skills list. `Explore` loads none of the first three.

The installer (`toolkit/install/Install-Toolkit.ps1`) currently copies four kinds of item and its own help text and the `toolkit-skills` spec promise that it never touches `settings.json`. This change reverses that promise for one key.

## Goals / Non-Goals

**Goals:**
- A subagent that nobody pinned lands on Sonnet, on any machine that ran the installer.
- A delegated task's context carries no skills list.
- The installer's one edit to the user's settings is safe, reversible by hand and explained before it replaces anything.

**Non-Goals:**
- Closing the gap where Claude explicitly passes `opus`. Only the rule discourages it. Closing it needs the force variable or a hook, and the user chose neither.
- Forcing every subagent to one model. Pinned agents and Haiku-for-search keep working.
- Changing `general-purpose`, `Explore` or `Plan`. They are built in and have no file we control.

## Decisions

**Set the default variable only, never the force variable.** The force variable would remove the Haiku pin on `opsx-test-runner` and the Haiku-for-search option. The cost is the explicit-`opus` gap above, which the rule covers softly.

**The installer step lives in the existing script, with its destination in `targets.json`.** The script already reads every destination from that file, so a new `settings` entry (`~/.claude/settings.json` globally, `.claude/settings.json` per project) keeps the script free of paths. The step runs after the item loop and only on a full install, so naming one rule or agent never reaches the settings file.

**Edit the file by parsing and rewriting it as JSON, after saving a backup.** The alternative is to insert text without parsing, which keeps the user's layout but breaks on a file with an existing `env` object or unusual spacing. Rewriting changes whitespace and, in Windows PowerShell 5.1, escapes characters such as `'` and `&` as `\uXXXX` sequences. Both are valid JSON that Claude Code reads the same way. The backup makes the change reversible, and an unparsable file is left untouched.

**Ask on a conflict, with parameters for unattended runs.** The user asked for a prompt that explains the choice. The coding rule for scripts prefers parameters over prompts, so the installer takes `-SubagentModel Overwrite|Skip` and, when no person is at the console, skips and prints a warning. `-NoSettings` switches the step off. The prompt text states that overwriting makes a subagent with no model passed or pinned run on Sonnet and replaces the current value, and that skipping keeps the current value and with it the current default.

**Uninstall leaves the key alone.** The installer cannot tell its own `sonnet` from one the user chose, so removing it could undo a deliberate setting. Uninstall prints the key to remove by hand.

**A new unscoped rule, not an addition to an existing one.** Each existing rule covers one topic and none covers delegation. The rule loads on every turn, so it stays short. The `.scratch/agents/` logging line stays in `jois-env-stay-in-repo`, and the new rule points to it.

**`jois-worker` keeps the user's rules and adds a commit guard.** It carries the same frontmatter hook that blocks `git commit`, `git push` and `gh` as `opsx-task-applier`, because it can edit files and the commit rule says only the main session commits. It omits the `Skill` tool, which is what removes the skills list. It does not use `omitClaudeMd`, because that would also drop the stay-in-repo and commit rules.

**Pin `sonnet` in `opsx-task-applier` and `code-validator`.** Without the pin they inherit whatever the main session runs on whenever the variable is unset, for example on a machine where the user skipped the installer's setting.

## Risks / Trade-offs

- [The settings step edits a file outside the repo, so a bug affects the user's machine] → A backup beside the file, a parse check before any write, and tests on mock settings files under `.scratch/` for a missing file, an empty file, no `env` object, existing keys, a nested `permissions` array, a nested `hooks` object, and the conflict cases.
- [The `env` block in `settings.json` may not behave like a shell variable for the subagent default] → The first task runs a headless session with `--settings <mock file>` and checks the model of a subagent before the installer step is built.
- [Rewriting the file reformats it] → Documented in the Install page, and the backup keeps the original.
- [The rule can be ignored, and an explicit `opus` still wins] → Accepted by the user. The rule says why Opus is not wanted, to make a slip less likely.
- [The wiki's agent count is already out of date: it says two agents and the folder holds three] → The task for the wiki pages recounts from a listing of each folder, as the page's own note says, and does not add one to the old number.
