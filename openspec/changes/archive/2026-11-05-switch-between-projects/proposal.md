# Proposal

## Why

The planner serves one project at a time, named by a single `codeBase` or `dataDir` in `planner.config.yaml`. Anyone who plans for more than one code base has to open the Settings tab, pick a folder and wait for a reload every time they change project, and the previous project is forgotten. A saved list of projects and a dropdown beside the backlog dropdown makes the change one click.

## What Changes

- A **Project dropdown** appears to the left of the Backlog dropdown. It lists the saved projects, with **Add Project…** always first.
- Choosing a saved project only changes which project's backlogs are shown. It uses the existing switch (save the folder, reload) and moves no files.
- **Add Project…** offers two ways to add: link a code base (data in `<code base>/.plans`, created on request) or create a new project (`planner/data/<name>/`, started with the usual first backlog).
- `planner.config.yaml` gains an optional `projects` list. Each entry is a path (`codeBase` or `dataDir`) plus an optional `name`. The top-level `codeBase` or `dataDir` stays and names the active project.
- A config with only a top-level folder and no list shows that folder as one project. It is written into the list the first time a project is added.
- The Settings tab's change-folder action now **relocates the current project**: the current backlogs are copied to the new folder and the project's saved path is replaced. An empty or missing target is copied to without a prompt. A target that already holds planner files asks the user to overwrite same-named files, just switch to the files there, or cancel. The old folder is never deleted from.
- The relocation no longer offers "init instead of copy" for an empty folder; an empty project is made with Add Project or Run init.
- The copy gains an explicit overwrite option, used only after that confirmation. The path is saved only after the copy has been read back.
- A saved path that no longer exists is shown disabled in the dropdown.

## Capabilities

### New Capabilities
- `project-switcher`: the saved list of projects, the Project dropdown, Add Project and what choosing a project does.

### Modified Capabilities
- `project-config`: the `projects` key and its validation; the Settings tab's change-folder flow becomes a relocation with a confirmation when the target holds planner files; the copy can overwrite on request.

## Impact

- `planner/logic/storage/project-config.cjs`: read, validate and save `projects`; keep the active entry and the list in step.
- `planner/logic/storage/project-folders.cjs`: `copyData` / `copyToCodeBase` gain an overwrite option; a check that lists which files an overwrite would replace.
- `planner/portal/server/server.cjs`: routes for adding a project and for the relocation, with the same `busy` refusal and loopback checks as the existing settings routes.
- `planner/portal/web/backlog-portal/`: `FileBar.jsx` (the dropdown), `hooks/useSettings.js` (relocation flow), `components/SettingsTab.jsx`, `shared/files.js` (client calls).
- `planner/planner.config.example.yaml` and tests under `planner/test/`.
- No breaking change: an existing config keeps working and no key is renamed or removed.
