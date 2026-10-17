## Why

The repo is growing from backlog tooling into a general set of admin tools for the team lead. Turning a pile of meeting notes into tidy minutes (who said what, decisions, action items) is a repeated chore that has a fixed format. A skill can do it from pasted notes, but the result must also be kept: `data/` is private and git-ignored, and `.claude/settings.json` denies `Read`/`Edit` on `./data/**`, so a skill can only save there through a script with a fixed target.

## What Changes

- New project skill `meeting-minutes` (`.claude/skills/meeting-minutes/`): the user pastes notes into the session; the skill maps them to the minutes template (`template.md` in the skill folder), asks the user for every field the notes do not give, shows the full minutes in chat, and after the user's OK saves them.
- New writer script `.claude/skills/meeting-minutes/write-minutes.mjs`: the only way the skill writes a file. Takes the title and the meeting date as arguments and the markdown on stdin, writes `data/meetings/<slug>_YYYY-MM-DD.md`, never overwrites (adds `_1`, `_2`, ... when the name exists), and replaces an existing file only in an explicit refinement mode.
- New private folder `data/meetings/`. It is not a CSV store: it is not added to `STORES`, so the file API and the portal do not reach it.
- Tests for the writer's pure logic (slug, file name, collision suffix, refinement) in `test/`.
- `CLAUDE.md` documents the skill and the folder, and no longer describes the repo as backlog-only.
- No launcher and no `guard-bash.mjs`: the skill needs no locked session.

## Capabilities

### New Capabilities
- `meeting-minutes-skill`: how the skill turns pasted notes into minutes (template, gaps asked not invented, attribution only from the notes, action-item defaults, confirm before saving) and how the writer script names, creates and refines files under `data/meetings/`.

### Modified Capabilities
<!-- None: no existing requirement changes. -->

## Impact

- New: `.claude/skills/meeting-minutes/{SKILL.md,template.md,write-minutes.mjs}`, `test/meeting-minutes.test.mjs`, `data/meetings/` (created on first write, git-ignored).
- Edited: `CLAUDE.md`. Possibly `.claude/settings.json` to allow the writer command, if skills need it for it to run without a prompt.
- Reuses `core/paths.cjs` (`DATA_DIR`, so `TLT_DATA_DIR` moves this folder too). `core/file-name.cjs` is not reused: `validateName` forces a `.csv` extension and is written for CSV stores.
- No change to the server, the portal, or any existing skill.
