# Design

## Context

The config holds one active folder, `codeBase` or `dataDir`, read by `loadConfig` and written by `saveConfig` in `planner/logic/storage/project-config.cjs`. The server switches folders live through `PUT /api/project`, and the Settings tab drives the flow in `useSettings.js`: check the folder, offer copy or init, save, reload. `copyData` in `project-folders.cjs` copies with an exclusive-create flag, so it never overwrites, and it does not read files back. See proposal.md for why the project list is wanted.

## Goals / Non-Goals

**Goals:**
- Keep the saved list and the active project in one config file, with the active path still in the top-level `codeBase` or `dataDir`, so every reader of the config, including the skills, keeps working untouched.
- Reuse the existing switch for choosing a project, so there is one switch path to keep correct.
- Make a relocation safe: the saved path changes only after the copy is verified, and the old folder is never touched.

**Non-Goals:**
- Removing, renaming or reordering saved projects. The list only grows through Add Project, and the user can edit the YAML by hand.
- Deleting or moving files out of the old folder.
- Showing several projects' backlogs at once.
- Giving the skills a way to pick a project; they keep reading the active one.

## Decisions

### The active path stays top-level; `projects` is a list of known paths

The config gains `projects: [{ name?, codeBase | dataDir }]` and keeps `codeBase` or `dataDir` as the active project. Choosing a project writes that entry's path to the top-level key through `saveConfig`, which already removes the other key.

Alternative considered: an `active:` key pointing into the list. It would mean every consumer (`resolve-data-dir.mjs` in each skill reads a flat `key: value` file and only `codeBase` and `dataDir`) must learn the list, and a flat reader cannot read a list at all. Keeping the active path top-level costs one duplicated path and leaves the skills unchanged.

The active project is found by comparing resolved absolute paths, so a relative path in one place and an absolute one in the other still match.

### The list is created lazily

A config without `projects` is shown as one project made from its active path. The list is written the first time a project is added, with the active path as its first entry. Until then the file is not touched, which keeps existing setups byte-for-byte unchanged and avoids a write on every page load.

### Add Project reuses the existing folder flows

Linking a code base calls the existing `checkCodeBase` and `initCodeBase`. Creating a new project reuses `initFolders` on `planner/data/<name>`, which `confineDir` already allows. The name is checked with `validateBacklogName` (the one set of name rules, in `file-name.cjs`) plus a case-insensitive check against existing folders and project names, because Windows folders ignore case.

A new project is stored as an absolute path, since `saveConfig` already requires one for `dataDir`.

### One server route adds a project

`POST /api/project/add` takes `{ codeBase, name? }` or `{ newName }`, does the check or init, appends the entry, switches the active path and answers the updated config. It sits with the other settings routes, so it inherits the loopback Host check, the same-origin header and the `busy` refusal. A project already in the list is switched to, not added twice. Choosing a saved project reuses `PUT /api/project`.

### Relocation is plan, then apply

The existing copy is one call that decides as it goes. A relocation needs to show the user the conflicts before anything changes, so it splits in two:

1. `plan`: a read-only pass that walks the source and lists which files already exist in the target. An empty list means there is nothing to confirm.
2. `apply`: the copy with `overwrite` set or not, then a read-back of every copied or overwritten file against the source, then the config save.

`copyData` gains an `overwrite` option (default off) and the plan reuses its walk, so the rules about links, `backups/` and containment stay in one place. Overwrite replaces only files present in both places and removes nothing else.

The save comes last. If the read-back finds a mismatch or a copy fails, the config is not written and the old project stays active, so a failed relocation leaves nothing to undo except the partial files in the new folder.

Alternative considered: copying to a temporary folder and renaming it into place. It is cleaner for an empty target but cannot express "merge into a folder that already has files", which the overwrite choice needs, so it was not used.

### Just switch is the existing switch

Choosing "just switch" in the confirmation calls the same save-and-reload as choosing a saved project, with the new path replacing the current entry's path instead of adding one. The entry is found by its old path before the replacement.

### Missing folders are checked when the list is served

`GET /api/project` returns each saved project with an `exists` flag, so the dropdown can disable a missing one without a request per entry. Nothing is removed from the list when a folder is missing, because a drive may only be unplugged.

### Client contract

`planner/portal/web/shared/files.js` is the one client for these routes, and the new calls go there. The project list in the `GET /api/project` reply is the one shape the dropdown and the Settings tab both read.

## Risks / Trade-offs

[Overwrite replaces the user's files in the target] → It runs only after a prompt that names the files, never by default, and the old folder is untouched so the source copy survives.

[The active path and the list entry can drift if the user edits the YAML] → The active project is matched by resolved path, and an active path missing from the list is shown as its own entry, so a mismatch shows up as an extra entry rather than an error.

[A relocation that fails halfway leaves partial files in the new folder] → The config is saved last, so the project keeps pointing at the old folder, and the reply names the files that were copied.

[Two Add Project requests at once] → The `busy` counter already serializes writes against switches, and the config write is atomic through a temp file and rename.

[A project name differing only by case on a case-sensitive disk] → Refused on every platform, which is stricter than needed on Linux but keeps one rule.

## Migration Plan

Nothing migrates. The new key is optional, an existing config loads and behaves as before, and the list appears the first time a project is added. Rolling back the code leaves a `projects` key that the older loader would refuse as unknown, so the user would delete the key by hand; this is noted in the example config.
