## Why

The backlog portal and the shape-stories sessions end at shaped user stories. Nothing turns them into the picture of the application they describe: the class and sequence diagrams and the use-case specification that describe each use case. Today those are drawn by hand, one use case at a time, and drift from the backlog as soon as stories are renumbered, split or reworded.

## What Changes

- A `/plan-stories` skill, started by `planner/claude/launchers/plan-stories.ps1 [backlog] [scope]`, that turns the stories of one **Epic**, one **Feature** or a single story into a *slice*: a use-case spec (`.md`), a class diagram and a sequence diagram (`.puml`). The skill discusses and drafts in the conversation, asks one yes/no and writes; it is one skill, not an explore/propose pair.
- It decides the unit with the user: Epic when its stories share one domain model and stay small enough to read as one picture, Feature when they do not, a single story only when it adds a flow of its own.
- A rules document, `planner/guidelines/diagram-conventions.md`, the single source for palette, stereotypes, `phase.step` ids, file layout and what an analysis-level diagram may and may not say. The skill cites it, as the story skills cite `product-backlog.md`.
- A `diagram-tools` MCP server (`planner/claude/mcp/diagram-tools.mjs`) with `read_diagrams`, `check_diagram`, `write_diagram` and, when a repo is configured, `repo_tree`, `repo_grep` and `repo_read`. The story reads stay on `backlog-tools --read-only`; the story writers are not exposed in these sessions.
- Slices are written to `planner/data/diagrams/<backlog>/<slice>/`. Story IDs live only in `source.json` there, as `{id, title, hash}`; the diagram files hold none. On every read the tool re-matches each story by Title, repairs a shifted ID and reports a changed or missing story as stale.
- The target repo is optional and remembered per backlog in a git-ignored `planner/data/diagrams/<backlog>/repo.json` (`path`, `exclude`). The repo tools are read-only, confined to the repo, and refuse a built-in baseline of secret files plus the user's own globs. No tool can edit `repo.json`.
- A mock slice built from the sample backlog, committed as a fixture under `planner/test/sample-data/` for tests.

## Capabilities

### New Capabilities
- `plan-stories-skill`: the skill, its launcher, how it picks Epic, Feature or story scope, its read-draft-confirm-write flow and what it never does.
- `diagram-conventions`: the rules document and the structural checks a slice must pass (palette, stereotypes, step ids, unique `@startuml` names, one spec row per acceptance criterion).
- `diagram-writer`: the `diagram-tools` server's reading and writing of slices, the `source.json` links to stories, healing by Title, stale detection, atomic writes and the write log.
- `repo-reader`: the per-backlog `repo.json`, the read-only repo tools, path confinement and the exclusion rules.

### Modified Capabilities
<!-- None. `backlog-tools-mcp` is deliberately left as it is: repo access and diagram writing live in a second server so the story sessions gain no new privilege. -->

## Impact

- New: `.claude/skills/plan-stories/` (skill, `locked-settings.json`, scripts), `planner/claude/launchers/plan-stories.ps1`, `planner/claude/mcp/diagram-tools.mjs`, `planner/guidelines/diagram-conventions.md`, pure logic under `planner/logic/diagrams/`, tests under `planner/test/`, the mock and the fixture.
- Changed: `planner/claude/launchers/backlog-tools-config.ps1` (a second server in the config, ready files for both) and `wait-for-backlog-tools.mjs` (waits for each ready file); `planner/data/` gains `diagrams/` (not a store: the file API cannot reach it); `planner/test/zones.test.mjs` and `CLAUDE.md` describe the new zone members.
- No change to the backlog CSV format, the stores, the portal or the existing skills. No new dependency: the MCP SDK and `zod` are already used.
- Rendering stays in the user's VS Code PlantUML plugin; nothing here renders or calls Java.
