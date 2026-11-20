# Story-to-code sample

A small habit and focus tracker, plus the saved result of every stage of the story-to-code flow. It lets you explain the flow, or test an edited skill, without building a project by hand and without paying for a full model run each time.

Nothing here is installed by the toolkit installer, and nothing in it imports a file outside `toolkit/`.

## What is in it

- `app/`: the baseline app (Vite, TypeScript, Tailwind CSS, browser local storage) with a habit list and daily check-off, a Pomodoro timer and a task category picker. It plays no sound.
- `wiki/`: the app's wiki. `wiki/Future-Releases.md` lists features not built yet, so a rerun of the flow always has something to add.
- `CLAUDE.md`: the mock repo's instructions (test command, where the docs live).
- `stages/<stage>/`: what one stage of the flow writes, laid out as it sits in the mock repo. The stages are `baseline`, `proposed`, `accepted`, `designed`, `planned`, `built`, `validated` and `archived`. The `baseline` stage is the `app/`, `wiki/` and `CLAUDE.md` above, so it has no folder.
- `build-mock-repo.ps1` (and `build-mock-repo.bat`, which only calls it): builds the mock repo.

The backlog is named `habits` with initials `H1`, so story IDs look like `H1-HAB-0001`.

## Build the mock repo

From the repo root, in Windows PowerShell:

```
toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage planned
```

The script builds `.scratch/mock-app/` as its own git repository on the branch `sample`, installs the toolkit into it at project scope, and runs `npm ci` inside it. It writes nothing outside that folder, leaves `~/.claude` alone and calls no model. Start Claude inside `.scratch/mock-app/` because the story skills look for their data folder (`.plans/`) in the current folder only.

- `-Stage` is one of the eight names above. The default is `baseline`. An unknown name stops the script and lists the valid ones.
- `-Reset` deletes an existing `.scratch/mock-app/` first. Without it the script stops and deletes nothing.
- `-Scope global` is refused.

## Restore to a stage

Run the script with `-Reset -Stage <name>`. It builds the baseline, then applies each saved stage in order up to the one named. The `built` stage holds `built.patch`, applied with `git am`, so the repo shows the commits that apply would have made.

## The sample canvas

The `designed` stage holds `.plans/habits/designs.json`, the pointer that tells the later stages where the design is. It points to one canvas (a page of screens drawn by the design stage, one screen per artboard) named "Habits Streaks design": https://claude.ai/artifact/HjAw3uh4iutuwMEG6F8Bco. The canvas has `Main`, the story index, and four artboards: `streaks-list-default-desktop`, `streaks-list-default-mobile`, `streaks-list-best-desktop` and `streaks-list-best-mobile`. The two list screens are two data states of one screen, so they do not link to each other.

The canvas is private to the account that made it, so another person cannot open it. The stages still build, and `sample-stages.test.mjs` still passes, because no test opens the canvas. A live plan, apply or validate run that reads artboards stops on the failed link instead: `task-applier` reports `blocked:`, and validate marks the claim as could not test.

To get a canvas of your own, build the mock repo at `accepted`, run `jois-story-design` there and approve its publish to your account. Then replace `stages/designed/.plans/habits/designs.json` with the pointer it wrote. The stages from `planned` onward name the old canvas in their Design lines, so they need recording again (see the next section).

## Test an edited skill

A saved stage shows what a skill wrote on the day it was recorded, so it cannot prove an edit works. Build the stage just before the skill under test, start Claude in `.scratch/mock-app/` and run the skill live. The toolkit is installed at project scope, so reinstall an edited skill with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill <name> -Force` after each edit (see the next paragraph for which copy a session then uses).

A global copy of a skill loads ahead of a project copy of the same name, so editing the project copy does not change what a session uses when the toolkit is also installed globally. Checked on 2026-11-12 (Claude Code 2.1.322): a marker word was put into the description of the project copy of `jois-story-explore` in a built mock repo, and a headless `claude -p --model sonnet` session started in that folder quoted the description without the marker. This agrees with Claude Code's documented order, where personal skills win over project skills. To test an edit, remove or rename the global copy first, which writes outside the project and needs your own approval, or give the skill under test a new name.

An agent works the other way round. The project copy of an agent loads ahead of the global copy, so an edited agent installed at project scope is the one a session uses.

A headless session (`claude -p`) has no Artifact tool, and design, plan, apply and validate open the canvas, so test those stages in an interactive session. Agents dispatched from an interactive session do get the tool: a project copy of `task-applier` whose `tools:` lists `Artifact` read a canvas file (checked 2026-11-20).

## Keep the stages valid

`node --test toolkit/tests/story/sample-stages.test.mjs` runs each saved stage's backlog, slice and diagrams through the toolkit's own checkers and applies `built.patch` to the baseline app, with no model. When a skill's output format changes and this test fails, record the walk again. No other test reads `stages/`: the story-skill tests use their own hand-written fixture in `toolkit/tests/story/fixtures/habits/`, so recording again never breaks them.

## Record the walk

Recording runs the whole flow once in a mock repo and costs real model tokens, so start it on purpose and never from a script or a test.

1. Build the mock repo at `baseline`.
2. Create the backlog the way the portal does: `.plans/habits/backlog.json` (`{"initials":"H1"}`) and an empty `.plans/habits/user-stories.csv`.
3. Run explore and propose for one feature from `wiki/Future-Releases.md`, and do the portal's accept step.
4. Run design, plan, apply, validate and archive.
5. Copy each stage's new files into `stages/<stage>/` with LF line endings, and make `git format-patch` of the code commits into `stages/built/built.patch`.

## The recorded walk

The walk built streaks (the current and the best streak of a habit) on 2026-11-20 with Claude Code and Sonnet subagents; the main session ran on Opus. It replaces the first walk of 2026-11-12, so the stages from `planned` onward come from this one. The `designed` stage is new in it.

It ran in an interactive session, not headless, because design, plan, apply and validate open the canvas and a headless session has no Artifact tool. The edited agents were installed at project scope. The skills and commands were followed from their project copies by reading the files, because a global copy of a skill would load first.

- **Design.** The main session followed `jois-story-design` at `accepted` for the feature Streaks (epic Habit tracking), both stories. It published the one private canvas described above and took the look from the mock app (Tailwind slate tones). It wrote the pointer with `write-design-pointer.mjs` and read it back. The review fixed three design problems in round 1 (input border contrast, line length on Main, link target size on Main), and the index check found nothing before or after. The review judged markup, not a rendered image.
- **Plan.** A Sonnet subagent followed the project `SKILL.md`. It found the design, the stale check found nothing, and it wrote the slice `streaks` with 5 tasks. Every task carries a `Design:` line, the pure logic tasks and the test task included, because the rule ties Design lines to the criteria a task satisfies. Verify gave 0 critical, 0 warnings and 2 suggestions, and both stories were frozen. It drew no context map this time, so `stages/planned/` no longer holds `context-map.json` and `context-map.md` (the context map is optional in plan).
- **Apply.** The main session followed the project `apply.md` and ran `task-applier` per group: see-current-streak (2 tasks), then see-best-streak (2 tasks plus the test task). Each report named the artboards it opened. There were four commits, one per task. The static review (the built-in code review at low effort) found nothing, so there were no fix rounds. The test task gave `npm test` exit 0 (7 passed) and `npm run build` exit 0. The apply stall watch was not started. `stages/built/built.patch` now holds four commits that change `app/src/storage.ts`, `storage.test.ts` and `main.ts` (there is no `streak.ts` file).
- **Validate.** The project `validate.md` checked 7 claims, all met at commit `f93dadf`. The user-interface claims were driven in a browser at 1440 px and 390 px and compared with their artboards, and `validation.md` cites the artboard links. Two layout differences that the criteria do not cover were noted: the current-streak screen also shows "Best 3", and on mobile the pill sits under the name, as on the best-streak artboard. No artboard file appeared in the mock repo's git status.
- **Archive.** A Sonnet subagent followed the project `archive.md`. It wrote `wiki/streaks/overview.md`, `reference.md` and `design.md`, edited `Home.md`, `_Sidebar.md` and `Future-Releases.md`, wrote `ARCHIVED.md` and removed the working files. It stopped before the commit because the build script commits the wiki.

What the walk showed, so a rerun does not hit it again:

- Archive keeps no record of the tasks' Design links, because they go with `tasks.md`. Only a link inside a decision row reached the wiki.
- A project needs `scripts/check_docs.py` before archive works. The build script copies it, with `build_wiki.py`, from the docs templates, as `/jois-init:docs` would.
- Validation and review record the commit they ran at, and archive refuses a validation older than the code. A commit that changes anything outside `wiki/` after validate means validating again.

## Cost of the recorded walk

There is no dollar figure, because an interactive session's subagent runs report tokens, not cost. The table gives subagent tokens, rounded.

| Stage | Tokens | Note |
| --- | --- | --- |
| Plan | about 134k | one subagent |
| Apply, group 1 | about 71k | see-current-streak |
| Apply, group 2 | about 73k | see-best-streak |
| Static review | about 51k | |
| Validate | about 160k | three agents: user interface 74k, backend 58k, test runner 28k |
| Test task | about 26k | |
| Archive | about 102k | one subagent |

The design run and the apply orchestration ran in the main session and are not counted.
