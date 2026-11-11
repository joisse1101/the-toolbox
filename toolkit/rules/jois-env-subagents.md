---
metadata:
  version: "1.0.0"
  last_updated: "2026-11-11"
---
# Subagents run on Sonnet or Haiku

Applies whenever you start a subagent (a helper session that does delegated work) or a headless
session (`claude -p`). Delegated work is usually simple, and Opus costs more than it needs.

## Which model

- Pass `model: sonnet` on every Agent call.
- Pass `haiku` only for a task that is pure file or keyword search.
- Never pass `opus`, and never rely on inheriting the main model, unless the user asks for another model.
- Claude Code picks a model in this order: the call's model, the agent file's `model`, `CLAUDE_CODE_SUBAGENT_MODEL`, then the main session's model.

## Which agent

- Use `jois-worker` for ordinary delegated work. It has no `Skill` tool, so it carries no skills list.
- Use `general-purpose` only when the task needs the Skill tool.
- A subagent that can write files logs its progress as `jois-env-stay-in-repo` says.

## Headless sessions

- Start `claude -p` with `--model sonnet`, `--disable-slash-commands` and `--strict-mcp-config`.
- Name the tools it needs with `--allowedTools`.
- Do not use `--bare`: it reads no login and needs an API key.
