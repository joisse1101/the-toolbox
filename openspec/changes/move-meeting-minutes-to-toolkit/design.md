# Design

## Context

- The planner's skill saves through a Node writer that imports `planner/logic/storage/paths.cjs`. That import cannot move into the toolkit, which depends on nothing in the planner.
- The toolkit ships commands, rules and agents. It has no skills today, and the installer copies one markdown file per command.
- `check_toolkit.py` requires `disable-model-invocation: true` on every command. It requires `metadata` versions only for the `jois-git`, `jois-init` and `jois-code` folders.
- Claude Code reads a file the user references with `@path`, and the `Read`, `Glob` and `Write` tools cover everything the command needs.

## Goals / Non-Goals

**Goals:**
- Keep the rewriting rules (never invent, ask for gaps, attribute only from the notes, action-item defaults) unchanged.
- Make the command self-contained: one markdown file with the template inline.

**Non-Goals:**
- No writer script, guard hook or launcher in the toolkit.
- No migration tool for files in `planner/data/meetings/`.
- No change to the planner's backlog features or to the data directory setting (issue #49).

## Decisions

### Command, not skill
- **Choice:** `toolkit/commands/jois-docs/meeting-minutes.md`, run as `/jois-docs:meeting-minutes`.
- **Why:** every toolkit item is a command, and a manual command is hidden from the session context.
- **Alternative:** a skill would be the toolkit's first one and would load its description into every session.

### Template inline in the command file
- **Choice:** the template sits in the command body, and the old `template.md` is deleted.
- **Why:** the installer copies one file per command, so a separate template file would need installer changes.
- **Alternative:** a command folder with a support file. It adds install and hash logic for one small file.

### Write with the `Write` tool, no script
- **Choice:** `allowed-tools: Read, Glob, Write`. The command builds the name `<slug>_<date>.md` itself and uses `Glob` to find a free `_<n>` suffix.
- **Why:** the old script existed to confine writes to `planner/data/meetings/` in a locked session. A toolkit command runs in the user's normal session, where the confirmation step is the control.
- **Alternative:** a Node writer. It would need `node` on every machine and break the standalone rule.
- **Trade-off:** a race on a taken name is possible. The old script used `linkSync` to rule it out. One user saving by hand makes it unlikely, so it is accepted.

### Save location comes from the reference
- **Choice:** a referenced notes file means "save in its folder". Pasted notes mean "suggest a repo folder and ask".
- **Why:** the user asked for this, and it needs no configuration file.
- **Suggestion method:** `Glob` for common folders (`docs/`, `meetings/`, `notes/`). The command proposes one and the user may name another.

### Refinement is an `@` reference to the minutes file
- **Choice:** the user references an earlier minutes file with new notes. After confirmation the command overwrites that file.
- **Why:** this replaces `--replace <file name>`, and the user already names the file by referencing it.
- **Guard:** the command overwrites only a file the user referenced as minutes, never one it merely read as notes.

### New command folder `jois-docs`
- **Choice:** add `jois-docs` to the versioned-command globs in `check_toolkit.py`, to its test, to the README domain table and to the installer's help text if it lists folders.
- **Why:** the user approved the name. Without the glob, the command would skip the version check.

## Risks / Trade-offs

- **Lost write confinement** → The command writes only after the user confirms the exact folder. It writes one file, and it never deletes.
- **Notes carry hidden instructions** → The command states that notes are data. It is manual only and has no shell tool.
- **Existing saved minutes become orphaned** → They stay in `planner/data/meetings/`, which is git-ignored. The user can move them by hand.
- **`meeting-minutes-skill` spec disappears** → The tracked rules move into `toolkit-meeting-minutes`. The Node-specific requirements go away on purpose.
- **Unchecked:** how the installed command behaves on a real machine. The task list verifies it on mock notes only.

## Migration Plan

1. Add the command and the check change, and verify them first.
2. Remove the planner's skill, launcher and tests.
3. Update `CLAUDE.md` and `README.md`.
4. Roll back by reverting the change. Nothing outside the repository is modified.
