# Story-to-code sample

A small habit and focus tracker, plus the saved result of every stage of the story-to-code flow. It lets you explain the flow, or test an edited skill, without building a project by hand and without paying for a full model run each time.

Nothing here is installed by the toolkit installer, and nothing in it imports a file outside `toolkit/`.

## What is in it

- `app/`: the baseline app (Vite, TypeScript, Tailwind CSS, browser local storage) with a habit list and daily check-off, a Pomodoro timer and a task category picker. It plays no sound.
- `wiki/`: the app's wiki. `wiki/Future-Releases.md` lists features not built yet, so a rerun of the flow always has something to add.
- `CLAUDE.md`: the mock repo's instructions (test command, where the docs live).
- `stages/<stage>/`: what one stage of the flow writes, laid out as it sits in the mock repo. The stages are `baseline`, `proposed`, `accepted`, `planned`, `built`, `validated` and `archived`. The `baseline` stage is the `app/`, `wiki/` and `CLAUDE.md` above, so it has no folder.
- `build-mock-repo.ps1` (and `build-mock-repo.bat`, which only calls it): builds the mock repo.

The backlog is named `habits` with initials `H1`, so story IDs look like `H1-HAB-0001`.

## Build the mock repo

From the repo root, in Windows PowerShell:

```
toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage planned
```

The script builds `.scratch/mock-app/` as its own git repository on the branch `sample`, installs the toolkit into it at project scope, and runs `npm ci` inside it. It writes nothing outside that folder, leaves `~/.claude` alone and calls no model. Start Claude inside `.scratch/mock-app/` because the story skills look for their data folder (`.plans/`) in the current folder only.

- `-Stage` is one of the seven names above. The default is `baseline`. An unknown name stops the script and lists the valid ones.
- `-Reset` deletes an existing `.scratch/mock-app/` first. Without it the script stops and deletes nothing.
- `-Scope global` is refused.

## Restore to a stage

Run the script with `-Reset -Stage <name>`. It builds the baseline, then applies each saved stage in order up to the one named. The `built` stage holds `built.patch`, applied with `git am`, so the repo shows the commits that apply would have made.

## Test an edited skill

A saved stage shows what a skill wrote on the day it was recorded, so it cannot prove an edit works. Build the stage just before the skill under test, start Claude in `.scratch/mock-app/` and run the skill live. Because the toolkit is installed at project scope, the skill under test is the project copy; reinstall it with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill <name> -Force` after each edit.

Unchecked: whether a project-scope skill loads ahead of a same-named global skill. Task 6.2 of the change `add-story-to-code-sample` settles it.

## Keep the stages valid

`node --test toolkit/tests/story/sample-stages.test.mjs` runs each saved stage's backlog, slice and diagrams through the toolkit's own checkers, with no model. When a skill's output format changes and this test fails, record the walk again.

## Record the walk

Recording runs the whole flow once in a mock repo and costs real model tokens, so start it on purpose and never from a script or a test. Build the mock repo at `baseline`, run explore, propose, accept, plan, apply, validate and archive for one feature from `wiki/Future-Releases.md`, copy each stage's new files into `stages/<stage>/`, make `git format-patch` of the code commits into `stages/built/built.patch`, and note the `/cost` figure here.

## Cost of the recorded walk

Not recorded yet.
