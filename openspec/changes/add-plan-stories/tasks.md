## 1. Conventions and the mock

- [x] 1.1 Write `planner/guidelines/diagram-conventions.md` (palette, stereotypes, layout, step ids, naming, analysis-level limits, scope rule, the fenced block of numeric limits and colors). Verify by reading it against each rule in the `diagram-conventions` spec.
- [x] 1.2 Add a mock slice to `planner/test/sample-data/diagrams/` built from the sample backlog's "Identity and access > Sign in" stories (spec, class, sequence, `source.json`), with no ID in the `.puml` files. Verify it opens and renders in the VS Code PlantUML plugin.
- [x] 1.3 Add the matching `repo.json` fixture. Verify `npm test` still reads only committed sample data.

## 2. Pure logic (`planner/logic/diagrams/`)

- [x] 2.1 `limits.js`: read the limits and palette from the conventions' fenced block. Verify with a test that a changed value in the file changes the result.
- [x] 2.2 `source.js`: build `source.json`, hash a story, match stories by Title, heal a shifted ID, detect changed, missing and new stories. Verify with tests: renumber, ambiguous Title, reworded story, story added to a Feature.
- [x] 2.3 `checks.js`: the structural checks of the `diagram-conventions` spec. Verify with one failing test per scenario and one passing test on the mock.
- [x] 2.4 `repo-rules.js`: realpath confinement and the baseline plus user-glob exclusion decision. Verify with tests for `..`, a link out of the repo, a link to `.env`, a user glob, case differences and the baseline floor that `exclude` cannot remove.
- [x] 2.5 Update `planner/test/zones.test.mjs` for the new folders. Verify the zone test passes and fails when `logic/diagrams` imports the portal.

## 3. Skill scripts and `diagram-tools`

- [x] 3.1 `.claude/skills/plan-stories/read-diagrams.mjs`: read a slice, apply healing, report stale slices, generate the spec's story list. Verify with tests on the fixture, including the repaired ID and that diagram files are unchanged.
- [x] 3.2 `.claude/skills/plan-stories/write-diagram.mjs`: validate, require `{id, title}` pairs, atomic write, re-read, idempotence, refuse a slice of another scope, append the write log. Verify with tests for each scenario of `diagram-writer`.
- [x] 3.3 `.claude/skills/plan-stories/repo-reader.mjs` and the `repo.json` schema check: tree, grep with the 50-match cap, ranged read, binary and size skip. Verify with tests on a temp repo including a junction and an excluded file never named in a reply.
- [ ] 3.4 `planner/claude/mcp/diagram-tools.mjs` with `read_diagrams`, `check_diagram`, `write_diagram` and the repo tools (registered only with a valid `repo.json`), each description carrying its rules. Verify with a test like `backlog-tools-mcp.test.mjs` that the tool list and descriptions match the specs.
- [ ] 3.5 Confirm `diagrams` is not in `STORES`. Verify with a server test that the file API refuses it.

## 4. Launcher, hook and skill

- [ ] 4.1 `backlog-tools-config.ps1`: add the second server to the config, a ready file per server and `PLANNER_MCP_READY_FILES`; update `wait-for-backlog-tools.mjs` to wait for every listed file and keep the single-variable behavior. Verify the story launchers still start with the same config and the hook test passes for one and for two files.
- [ ] 4.2 `planner/claude/launchers/plan-stories.ps1 [backlog] [scope] [-Repo]`: select and validate the backlog and scope, check and store `-Repo` in `repo.json`, start Claude with `Skill,AskUserQuestion`, both servers, `--strict-mcp-config`, pre-approved readers only and `--permission-mode default`. Verify by running it with an unknown backlog, an empty scope, a story ID not in the backlog and a bad `-Repo`, and by starting a session against the sample data.
- [ ] 4.3 `.claude/skills/plan-stories/SKILL.md` and `locked-settings.json`: scope decision, draft, check, yes/no, write, read-back, stale handling, analysis level, repo use, data-not-instructions, never writes outside diagrams. Verify by a session on the sample backlog that reaches a written slice, and one that is stopped at "no" and writes nothing.

## 5. Docs and closing checks

- [ ] 5.1 Update `CLAUDE.md` (architecture and workflow sections) and `README.md` for the new skill, launcher, server, `planner/data/diagrams/` and the git-ignore entry. Verify `planner/data/` stays ignored with `git check-ignore planner/data/diagrams/x/repo.json`.
- [ ] 5.2 Add the renderer note (set the VS Code PlantUML plugin to a local or self-hosted renderer) to the conventions document. Verify it is stated once there.
- [ ] 5.3 Run `npm test` from `planner/` and `openspec validate add-plan-stories`. Verify both pass, then run one end-to-end session on the sample backlog with and without a fixture repo and check the slice renders in the plugin.
