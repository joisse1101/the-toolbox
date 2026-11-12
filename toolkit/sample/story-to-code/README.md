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

A saved stage shows what a skill wrote on the day it was recorded, so it cannot prove an edit works. Build the stage just before the skill under test, start Claude in `.scratch/mock-app/` and run the skill live. The toolkit is installed at project scope, so reinstall an edited skill with `Install-Toolkit.ps1 -Scope project -Path .scratch/mock-app -Skill <name> -Force` after each edit (see the next paragraph for which copy a session then uses).

A global copy of a skill loads ahead of a project copy of the same name, so editing the project copy does not change what a session uses when the toolkit is also installed globally. Checked on 2026-11-12 (Claude Code 2.1.322): a marker word was put into the description of the project copy of `jois-story-explore` in a built mock repo, and a headless `claude -p --model sonnet` session started in that folder quoted the description without the marker. This agrees with Claude Code's documented order, where personal skills win over project skills. To test an edit, remove or rename the global copy first, which writes outside the project and needs your own approval, or give the skill under test a new name.

## Keep the stages valid

`node --test toolkit/tests/story/sample-stages.test.mjs` runs each saved stage's backlog, slice and diagrams through the toolkit's own checkers and applies `built.patch` to the baseline app, with no model. When a skill's output format changes and this test fails, record the walk again. No other test reads `stages/`: the story-skill tests use their own hand-written fixture in `toolkit/tests/story/fixtures/habits/`, so recording again never breaks them.

## Record the walk

Recording runs the whole flow once in a mock repo and costs real model tokens, so start it on purpose and never from a script or a test.

1. Build the mock repo at `baseline`.
2. Create the backlog the way the portal does: `.plans/habits/backlog.json` (`{"initials":"H1"}`) and an empty `.plans/habits/user-stories.csv`.
3. Run explore, propose, plan, apply, validate and archive for one feature from `wiki/Future-Releases.md`, and do the portal's accept step.
4. Copy each stage's new files into `stages/<stage>/` with LF line endings, and make `git format-patch` of the code commits into `stages/built/built.patch`.

## The recorded walk

The walk built streaks (the current and the best streak of a habit) on 2026-11-12 with Claude Code 2.1.322 and Sonnet. It ran headless (`claude -p --model sonnet --output-format json`, one call per stage) because no person was at the keyboard, which changed three things.

- **Answers given up front.** The prompts held the agreed stories and the design answers, and said to take the recommended option wherever a command would ask the user. A headless session cannot answer `AskUserQuestion`, so apply and archive each stopped once on a question and were run again with that instruction.
- **Accept is scripted.** The portal's Accept all button was replaced by `acceptProposed` and `serializeBacklog` from `planner/logic`, the same functions the portal calls.
- **The proposals file was rebuilt.** Accept emptied it before it was copied, so `stages/proposed/.plans/habits/user-stories/proposals.csv` is rebuilt from what the propose run printed.

What the walk showed, so a rerun does not hit it again:

- The propose writer refuses a Priority field, so the proposed stories have none.
- A project needs `scripts/check_docs.py` before archive works. The build script copies it, with `build_wiki.py`, from the docs templates, as `/jois-init:docs` would.
- Validation and review record the commit they ran at. Archive refuses a validation older than the code, so a commit that changes anything outside `wiki/` after validate means validating again. `review.md` still records `c06e6f6`, and the later docs-checker commit changed no app code.
- The review left five findings unfixed. They are written in `review.md`.

## Cost of the recorded walk

About $6.45 in total, from `total_cost_usd` in each call's JSON (the figure `/cost` shows is not available headless). Of that, about $1.5 went on attempts that stopped early and were run again.

| Stage | Cost | Note |
| --- | --- | --- |
| Explore | $0.22 | writes nothing |
| Propose | $0.20 + $0.26 | the first try found no backlog file |
| Plan | $0.58 | the slice, the freeze and verify |
| Apply | $1.04 + $2.10 | four tasks, then review rounds and fixes, test task, validation |
| Validate | $0.62 + $0.58 | run again after the docs checker commit |
| Archive | $0.36 + $0.18 + $0.31 | no docs checker, then a stale validation, then archived |

A run with the answers ready and the backlog file in place should cost roughly $4 to $5. That is an estimate from the figures above, not a measured run.
