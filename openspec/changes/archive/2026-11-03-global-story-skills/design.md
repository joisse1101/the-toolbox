# Design

## Context

See `proposal.md` (Why and What Changes) for the motivation and scope. The current state that shapes the approach:

- **Scripts import the planner by path.** Thirteen script files in the story skills import `planner/logic/` or `.claude/skills/_shared/`. The toolkit may import nothing outside itself.
- **The portal shares eight logic files.** It imports `model`, `ids`, `story-text`, `proposals`, `review`, `lexicon`, `lexicon-suggestions` and `story-search` from `planner/logic/`. It imports nothing from `planner/logic/diagrams/`.
- **The data folder comes from the planner's config.** `project-config.cjs` reads `planner.config.yaml` (or the file `PLANNER_CONFIG` names) with the `yaml` npm package. A global skill has no such file and no `node_modules`.
- **The skills read guidelines from this repo.** `_shared/paths.cjs` points at `planner/guidelines/`. Outside this repo that folder does not exist.
- **Only one script needs npm packages.** `plan-stories/parse-mermaid.mjs` loads `mermaid` and `jsdom`.
- **The installer treats a skill as a folder of files.** `Get-ItemHash` hashes every file in it, and `-Force` and `-Uninstall` delete and copy the whole folder.
- **Confirmed (not revisited here):** all four skills move; reading uses ordinary file tools and guardrails stay on writes (#75); the logic is a generated copy; the Mermaid check uses a skill-local `npm ci`, run by the installer.

## Goals / Non-Goals

**Goals:**

- Each installed skill runs from its own folder, with no path into `planner/`.
- A copy of shared logic cannot drift unnoticed.
- A skill's behaviour stays as it is today (validation, messages, confirmation steps).

**Non-Goals:**

- Changing the portal or the planner's file layout.
- Replacing the logic with a rewrite. The copies are the same code.
- Installing packages for skills that declare none, or any package manager other than `npm`.

## Decisions

### 1. The planner is the source of truth; a build script writes the copies

- A script in `planner/` (proposed: `planner/scripts/sync-skill-logic.mjs`) copies the shared files into each skill's `lib/` folder and rewrites the import paths to relative ones.
- Each skill gets only the files it needs, so skills stay self-contained and no `_shared/` folder is installed.
- Every copied file starts with a header line naming its source and saying not to edit it.
- A planner test runs the script into a temp folder and fails when a committed copy differs. This is the drift check.
- **Alternative:** the toolkit owns the code and the planner imports it. Rejected: the planner would then depend on the toolkit, and `CLAUDE.md` says nothing depends on it.
- **Alternative:** hand-maintained copies. Rejected: they drift.

### 2. `planner/logic/diagrams/` moves into `plan-stories` and is not copied

- Only skills use it, so there is one owner and nothing to sync.
- Its tests move to `toolkit/tests/` (Node's own test runner, no new dependency) or stay under `planner/test/` pointing at the skill folder. The task list picks one.

### 3. Data-folder lookup without the `yaml` package

- The skills need only one key, `dataDir`. A bundled `resolve-data-dir.mjs` reads that key from a flat `key: value` file, so no `yaml` package is needed.
- Order: the `PLANNER_CONFIG` variable, then `planner.config.yaml` found upward from the current folder, then ask the user.
- A relative `dataDir` is resolved against the config file's folder, as the planner does.
- **Alternative:** require `yaml` in every skill. Rejected: it would force `npm ci` on skills that otherwise need none.
- **Risk:** a config with a richer YAML form than flat keys. See Risks.

### 4. Guidelines are bundled as generated copies

- `product-backlog.md`, `sprint-points-guideline.md` and `diagram-conventions.md` are copied into each skill's `references/` by the same build script.
- The planner's `planner/guidelines/` stays the source, because the portal also shows it.
- The skills' instructions cite `references/<file>` instead of `planner/guidelines/<file>`.

### 5. Writers run through Bash; the read confinement goes

- The writers keep their all-or-nothing validation, atomic write and read-back. The skill calls them as `node <skill folder>/<writer>.mjs`.
- The reader scripts that compute something (`checks`, the stale-slice report, ID healing, `index`) stay as scripts. The ones that only print a file are replaced by ordinary file reads.
- `guard-bash.mjs`, the MCP servers and the confined repo reader are deleted. The skills' `allowed-tools` lists are rewritten to name `Bash` for the writers and the file tools for reading.
- `check_drafts` becomes a `--check` flag on each writer, so the validate-without-writing step remains. The scripts already have it (`write-proposal.mjs <backlog> --check`).
- The story reader stays one script, `read-story-context.mjs`, with the forms it has (a section, one story by ID) plus a search form and a file-part form that wrap the functions behind `search_stories` and `read_file`. This keeps their limits (25 results, 50 matches, 200 lines) and the Title check, so the skills' behaviour does not change.
- The Title check moves from the tool to the skill: the scripts check a Title only when one is given, so each skill's instructions require passing the Title with every ID.
- The plan skill reads the target repo with ordinary `Read` and `Grep` (#75). The repo is the current folder, so `repo.json` and the per-backlog repo setting go away with the confined reader.
- **Alternative:** keep an MCP server inside the toolkit. Rejected: it needs the launcher setup that is being removed.
- **Risk:** a Bash call can write anywhere. Mitigation: the writers resolve their target from the backlog name and the kind, and refuse a path outside the data folder, as they do today.

### 6. Skills with scripts, and `plan-stories` with a `package.json`

- `toolkit/skills/jois-story-plan/` carries `package.json` and `package-lock.json` with `mermaid` and `jsdom`. `Install-Toolkit.ps1` runs `npm ci` there after copying the skill.
- `parse-mermaid.mjs` resolves the packages from its own folder.
- When the packages are missing, the writer says "run `npm ci` in `<folder>`" and refuses the write. It never skips the check silently.
- `Get-ItemHash` skips `node_modules`, so a skill with installed packages is still `up to date`.
- The installer runs `npm ci` only when it installs or replaces such a skill, never for an up-to-date one. `-Force` replaces the whole skill folder and then reinstalls; `-Uninstall` removes the whole folder, `node_modules` included, because the installer created it.
- A switch (proposed name `-NoPackages`) skips the step and prints the folder and command. If `npm` is missing or `npm ci` fails, the files stay installed, the folder and command are printed, the other items continue and the exit code is non-zero.
- `check_toolkit.py` and the `toolkit-skills` spec learn that a skill may hold scripts, a `package.json` and `lib/`, and that `package-lock.json` must exist beside a `package.json`.
- **Alternative:** a subset checker in plain JS, or `npx` per run. Rejected by the user in favour of the skill-local install.

### 7. Names and versions

- Proposed names: `jois-story-explore`, `jois-story-propose`, `jois-story-review`, `jois-story-plan`, and commands under `commands/jois-story/` (`/jois-story:propose`, `/jois-story:re-read`, `/jois-story:review`).
- `story` is added to the domain table in `toolkit/README.md`.
- Each starts at `metadata.version: "1.0.0"`.
- The skills' text is edited only where a name, a path or a tool name changes.

### 8. Removal order

- Delete the launchers, MCP servers, locked settings, guard and repo reader last, after the moved skills pass their checks, so the planner is never without a working path.
- `planner/test/zones.test.mjs` drops the rules about skills and `planner/claude/`.

## Risks / Trade-offs

- **A shared file's copy is stale in an installed skill** → the sync test covers the repo, and `-List` shows `differs` for an installed copy older than the toolkit's.
- **The flat config reader meets a richer YAML file** → the reader fails naming the line, and the user can set `PLANNER_CONFIG` or answer the prompt. Checked against `planner.config.yaml` and the test sample config only.
- **`npm ci` fails or `npm` is missing during install** → the installer reports it and ends non-zero. The writer's message also names the folder and command, so the skill never writes without the check. The other three skills are unaffected.
- **The installer now runs a package manager in `~/.claude/skills/`, outside any project** → it runs only for a skill that declares a `package.json`, uses the committed lock file, and can be skipped with the switch.
- **Bash writes are less confined than MCP writes** → targets are fixed by the writers, as before. The confinement the issue accepts is on reading (#75).
- **Larger skill folders** → each carries its own copy of the shared logic (about 2,000 lines). Accepted for self-containment.
- **The generated copies add noise to diffs** → they live under `lib/` with a header, and a change to a source file shows in both places by design.
- **Unverified:** whether the installed skills can run Node scripts the way a project skill can in a plain session. The check "start a session in another folder and confirm each moved skill loads" covers this and should also run one writer with `--check`.
