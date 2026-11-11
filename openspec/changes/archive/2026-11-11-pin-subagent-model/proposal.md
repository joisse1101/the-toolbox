# Proposal

## Why

Subagents (helper sessions that Claude starts to do delegated work) inherit the main session's model when nothing sets one, and the main session runs Opus. Delegated tasks are usually simple, so Opus costs more than the work needs. The built-in `general-purpose` agent also carries the full skills list, which a delegated task does not use.

## What Changes

- Add an unscoped rule `jois-env-subagents` that tells Claude which model to pass when it starts a subagent or a headless session (`claude -p`), and which agent to use for ordinary delegated work.
- Add an agent `jois-worker` on `sonnet` with file and shell tools and no `Skill` tool, so it sees no skills list.
- Pin `model: sonnet` in `opsx-task-applier` and `code-validator`. `opsx-test-runner` stays on `haiku`.
- Make the installer set `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` in the `env` block of Claude Code's `settings.json`, as the default model for any subagent that has no model passed and none pinned. It never sets the force variable, because that would override the Haiku pin on `opsx-test-runner`.
- **BREAKING**: the installer used to promise that it never modifies `settings.json`. It now edits one key there. When the key already holds another value, it warns, explains the effect of overwriting and of skipping, and asks the user.
- Update the wiki, the docs check and the toolkit tests for the new rule, the new agent and the installer step.

Verified on Claude Code 2.1.322 with a headless test: with the variable set, a subagent with no model passed ran on Sonnet, an agent pinned to Haiku stayed on Haiku, and a call that passed `opus` still got Opus. The rule closes that last gap only softly.

## Capabilities

### New Capabilities

- `toolkit-subagent-model`: the rule that keeps subagents and headless sessions on Sonnet (or Haiku for pure search), the `jois-worker` agent, the model pins in the toolkit's agents, and the installer's default-model setting with its conflict prompt.

### Modified Capabilities

- `toolkit-skills`: the requirement "Scope limited to skill, command and rule folders" currently forbids the installer from touching settings; it changes to allow the one `env` key and nothing else in `settings.json`.

## Impact

- `toolkit/rules/jois-env-subagents.md` (new) and `toolkit/rules/jois-env-stay-in-repo.md` (pointer to it).
- `toolkit/agents/jois-worker.md` (new), `toolkit/agents/opsx-task-applier.md` and `toolkit/agents/code-validator.md` (model pin and version bump).
- `toolkit/install/Install-Toolkit.ps1`, `toolkit/install/targets.json` and their tests.
- `toolkit/check_toolkit.py` and `toolkit/tests/test_check_toolkit.py` (the new unscoped rule and the new agent).
- `wiki/toolkit/Rules.md`, `Toolkit-Guide.md`, the install page and `toolkit/README.md` (counts and the new behavior).
- The user's `~/.claude/settings.json` changes on a real install. Tests use a mock settings file under `.scratch/` only.
