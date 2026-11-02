## Context

Claude installed pytest into the global Python because no rule said where packages go. The toolkit already has two always-loaded rules for actions that touch no code file (`jois-git-commit-hygiene`, `jois-test-mock-data`), and a docs check (`check_toolkit.py`) that enforces which rules are scoped and which are not. The new rule follows that pattern.

## Goals / Non-Goals

**Goals:**
- One short, language-agnostic test: an install must land inside the project.
- Python gets the concrete `.venv` steps, because that is where the incident happened.
- The rule loads in a session that only runs shell commands.

**Non-Goals:**
- No hook or permission setting that blocks `pip` or `npm -g`. That would enforce the rule mechanically but is a separate change.
- No change to `jois-code-python.md` content, and no change to the installer.

## Decisions

- **New unscoped rule, not a bullet in `jois-code-core-principles`.** The core principles load only when a source file is touched (`paths:`), so a session that only runs `pytest` or `npm` would miss them. Alternative: a bullet in `jois-code-python.md`, rejected for the same reason and because it would cover Python only.
- **Name `jois-env-local-installs`.** It names the topic (environment, local installs) and is not Python-specific.
- **State the principle, then the Python recipe.** The test ("lands inside the project?") covers every ecosystem; the `.venv` steps are the one worked example the issue asks for. Other ecosystems need no listing because their usual project-local installs (`npm ci`, `cargo`, `go mod`) already pass the test.
- **Ask when no local way exists.** This matches the replies rule: a wrong guess that reaches outside the repo is a reason to ask. Refusing outright would block legitimate needs such as a system tool the user must install themselves.
- **Per-worktree environments.** A worktree with no `.venv` creates its own. Reusing the main checkout's would write outside the worktree, which is how the original incident arose.
- **Allow `npx`-style one-offs.** They use a download cache and install nothing on the machine, so they pass the intent of the rule. This default was stated to the user during exploration.
- **Docs check.** Add the rule to `UNSCOPED_RULES` with tests mirroring the mock-data rule's two tests.

## Risks / Trade-offs

- **Context cost:** another always-loaded block. Mitigated by keeping the rule short, in one-idea bullets.
- **Gray areas stay judgment calls:** for example a tool that writes a user-level cache or config. The rule's test (does it land inside the project) gives Claude a question to ask, not a complete list.
- **No mechanical enforcement:** a rule is guidance, so Claude can still err. A hook would be a follow-up if it recurs.
- **`.venv` ignored by git:** the README states `.venv/` ignores itself, so creating it adds no untracked-file noise (known from the README, not rechecked for each project).
