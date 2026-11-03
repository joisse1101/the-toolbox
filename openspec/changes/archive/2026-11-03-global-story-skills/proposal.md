# Proposal

## Why

The four story skills work only through the planner's launchers, two MCP servers (helper processes that give Claude typed tools) and per-skill `locked-settings.json` files. Keeping that confinement working has become costly, and it stops the skills from being used in any other code base. Moving them into the toolkit makes them install globally with `Install-Toolkit.ps1` (GitHub issue #74). It also unblocks #75, which lets the skills read a code base's archived docs with ordinary file tools.

## What Changes

- Move `explore-stories`, `propose-stories`, `review-backlog` and `plan-stories` from `.claude/skills/` into `toolkit/skills/`, renamed to the toolkit's `jois-<domain>-<thing>` rule (proposed domain: `story`).
- Move the `/story:*` commands into `toolkit/commands/`, as a `jois-story` namespace.
- Give every moved skill and command a `metadata.version` and `metadata.last_updated`.
- Let a toolkit skill carry scripts and, for `plan-stories`, a `package.json`:
  - The installer runs `npm ci` in the installed skill folder for the Mermaid syntax check (a switch skips it and prints the command; a failure is reported and the exit code is non-zero).
  - The installer's content hash ignores `node_modules`, so `-List` stays `up to date`.
  - The writer says "run `npm ci` in `<folder>`" and refuses the write when the packages are missing.
- Keep the write guardrails: the writers and their validation run as scripts through Bash. Drop the read confinement: the skills read with ordinary file tools (the direction of #75).
- Bundle the shared planner logic into the skills as a **generated copy** (a build script writes it, a test fails when a copy differs from its source). The planner stays the source of truth for the files the portal also uses.
- Move `planner/logic/diagrams/` into the `plan-stories` skill whole, because only the skills use it.
- Find the data folder from `PLANNER_CONFIG`, else a `planner.config.yaml` found upward from the current folder, else ask the user.
- **BREAKING:** remove the launchers, both MCP servers, `guard-bash.mjs`, the skills' read-only `allowed-tools` lists, the `locked-settings.json` files and the confined repo reader, once nothing uses them. Remove their descriptions from `CLAUDE.md` and the README.
- **BREAKING:** skill and command names change (`/story:propose` becomes `/jois-story:propose`).

Out of scope:

- The portal, its CSV file API and the data folder.
- Slimming the portal to a pure viewer. It would remove Apply, Dismiss and Accept, so it is a separate issue.
- Any change to what the skills do, and reading archived wiki docs (#75).

## Capabilities

### New Capabilities

- `toolkit-story-skills`: the four story skills and their commands as global toolkit items: naming, versioning, the generated logic copy and its sync test, data-folder lookup, writers run through Bash, and the `npm ci` step of `plan-stories`.

### Modified Capabilities

- `toolkit-skills`: a skill may carry scripts and a `package.json`; the installer runs `npm ci` for a skill with a `package.json` and ignores `node_modules` when comparing; story commands are versioned.
- `story-writing-skills`: `explore-stories` and `propose-stories` move to the toolkit; the locked-down sessions, the launcher and the writer-tool check go; the context reader's rules stay.
- `story-proposal-writer`, `lexicon-writer`, `lexicon-suggestions`: the writers are scripts run with Bash, and the Title rule becomes a skill duty.
- `backlog-review-skill`, `backlog-review-suggestions`: `review-backlog` moves to the toolkit; its writer is run with Bash.
- `plan-stories-skill`, `diagram-writer`, `context-map`, `diagram-conventions`: the launcher and the MCP tools go; the plan scripts and ordinary file tools replace them.
- `backlog-folder-layout`, `csv-file-store`, `project-config`: wording that named the launchers and tool servers.
- `backlog-tools-mcp`, `repo-reader`: removed (all requirements retired).

## Impact

- **Moved or removed code:** `.claude/skills/*`, `.claude/commands/story/*`, `planner/claude/launchers/*`, `planner/claude/mcp/*`, `planner/logic/diagrams/*`, and the tests that cover them.
- **New code:** the toolkit skill folders, a build script for the logic copy and its sync test, and extensions to `toolkit/install/` and `check_toolkit.py`.
- **Docs:** `CLAUDE.md`, `README.md`, `toolkit/README.md`.
- **Dependencies:** `mermaid` and `jsdom` move from `planner/package.json` into the `plan-stories` skill's own `package.json`.
- **Zone rules:** `planner/test/zones.test.mjs` changes, since skills no longer import the planner by path.
- **Checks to pass:** `python check_toolkit.py` and `python -m pytest` from `toolkit/`, `npm test` from `planner/`, `Install-Toolkit.ps1 -List`, and a skill loading in a session started in another folder.
