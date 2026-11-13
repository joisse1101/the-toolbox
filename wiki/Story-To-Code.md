# Story to Code

This page follows one feature from an idea to merged code: the stages in order, what each one writes, and how to find the next command when you come back to the work later. Each stage has its own page with the detail, linked from its row. The flow uses the story skills of the planner and the `jois-code` commands of the toolkit, so install both first (see [Install](toolkit/Install.md)).

A **slice** is the unit the flow builds: a set of stories planned together into one folder, `<backlog>/slices/<slice>/`, holding the use-case document `UC-<slice>.md`, the build tasks `tasks.md` and `source.json`. A **backlog** is a folder of the planner's data folder that holds `user-stories.csv`.

## The stages

Start Claude in the code base folder, because the skills look for the data folder (`.plans`, or the folder `PLANNER_CONFIG` names) in the current folder only. Then run the stages in this order. Explore and review are optional, and every other stage needs the one before it.

1. **Explore** the idea with `jois-story-explore`. It discusses scope, splitting and acceptance criteria and writes nothing. See [Story Skills](planner/Story-Skills.md).
2. **Propose** the agreed stories with `/jois-story:propose`. It writes them to `<backlog>/user-stories/proposals.csv`.
3. **Accept** them in the portal's Proposed tab, which moves them into `<backlog>/user-stories.csv`. See [User Flows](planner/User-Flows.md).
4. **Review** the backlog with `jois-story-review` when you want a wider check. Apply or dismiss its suggestions in the portal's Review tab.
5. **Plan** a slice with `jois-story-plan`. It asks the design questions the stories leave open, writes the slice folder, freezes the stories it covers, checks the slice with verify and then asks whether to commit the plan files (`UC-<slice>.md`, `tasks.md` and `source.json`) with "Yes, commit" or "Not now". It skips the question when the folder is not a git repository or git ignores the files. See [Story Skills](planner/Story-Skills.md#committing-the-plan-files).
6. **Verify** the slice with `/jois-story:verify` if you changed it or its stories since it was planned. It reports what would break the build and fixes the slice only after you approve.
7. **Build** it with `/jois-code:apply slice <backlog>/<slice>`, or give a shorter form such as the slice name and the command asks when it is unsure. Agents carry out the tasks one group at a time, and each finished group is committed on your branch. Before the tests the command reviews the code, fixes what the review finds for at most two rounds, and writes `review.md` into the slice folder. See [Task Agent](toolkit/Task-Agent.md).
8. **Validate** it with `/jois-code:validate slice <backlog>/<slice>`. Agents test each acceptance criterion against the running code and write `validation.md` into the slice folder. The slice is validated only when every claim is met.
9. **Archive** it with `/jois-code:archive slice <backlog>/<slice>`, or with a slice name, a backlog name or nothing, in which case it asks which slice. It writes the slice into the wiki, one folder per topic with an overview, a reference and a design page, and records the slice in `ARCHIVED.md` with a validation and review summary. It shows every page before it writes, then asks whether to delete the slice's working files (`UC-<slice>.md`, `tasks.md`, `review.md`, `validation.md`, `validation.partial.md`), warning you when any is untracked because that delete is permanent. It then stops at the commit rule's confirmation word for one commit of the wiki pages, `ARCHIVED.md`, `source.json` and the deleted tracked files. See [Command Details](toolkit/Command-Details.md).
10. **Open the PR** with `/jois-git:write-pr`. The wiki commit of the archive travels in the same PR as the code. The PR's Author Verification list comes from the slice's `validation.md` and `review.md`, or from the tables of `ARCHIVED.md` once archive has removed them, so it holds the results even in a new chat.

Archive refuses a slice that is stale, has an unticked task, a `TBC` decision or an open question, or whose validation is not current. So when archive stops, it names the stage to go back to, and you never have to guess whether the wiki matches the code.

## What each stage leaves behind

The slice folder lives in the data folder. Plan offers to commit `UC-<slice>.md`, `tasks.md` and `source.json`, apply stages `tasks.md` with each group's commit only when git tracks it, and no command stages `review.md`, `validation.md` or `validation.partial.md`: they are working files that archive copies into `ARCHIVED.md` and then removes. When archive is done the folder is a **reduced slice**, holding `ARCHIVED.md` and `source.json` only. The file table is in [Data Folder](planner/architecture/Data-Folder.md).

| Stage | Writes | Committed |
| --- | --- | --- |
| Propose | `<backlog>/user-stories/proposals.csv` | no |
| Accept (portal) | `<backlog>/user-stories.csv` | no |
| Plan | `<backlog>/slices/<slice>/` (`UC-<slice>.md`, `tasks.md`, `source.json`) | only when you answer "Yes, commit" |
| Build | the code, ticks in `tasks.md`, `review.md` | the code, one commit per group, with a tracked `tasks.md` |
| Validate | `validation.md`, or `validation.partial.md` for one story | no |
| Archive | `wiki/<topic>/` pages, `ARCHIVED.md`, the deletion of the working files | one commit, after your confirmation word: the wiki pages, `ARCHIVED.md`, `source.json` and the deleted tracked files |

## Which command is next

Every command can be run again, and it picks up where it stopped. When you come back to a slice and do not know where it stands, read its folder and take the first row that holds.

| The slice folder shows | Run next |
| --- | --- |
| No slice folder | `jois-story-plan` |
| A task in `tasks.md` not ticked | `/jois-code:apply slice <backlog>/<slice>` |
| No `validation.md`, or `Validated: no` | `/jois-code:validate slice <backlog>/<slice>` |
| `validation.md` with a `Tested commit:` older than the code | `/jois-code:validate slice <backlog>/<slice>` |
| `Validated: yes` at the current code, and no `ARCHIVED.md` written since the latest code commit | `/jois-code:archive slice <backlog>/<slice>` |
| `ARCHIVED.md` written since the latest code commit, and its wiki commit made | `/jois-git:write-pr` |
| Only `ARCHIVED.md` and `source.json` (a reduced slice) | `/jois-git:write-pr`; archive and validate say the slice is archived and do nothing |

A `validation.partial.md` alone never counts as validated, because it tested one story only. An `ARCHIVED.md` from an earlier commit records an earlier archive, so after new code the slice is archived again, and the rerun replaces its block in the wiki in place.

When a story changes after the slice was planned, apply, validate and archive report the slice as stale and stop. Redraw it with `jois-story-plan` and run the stage again.

## Try the flow on a sample project

`toolkit/sample/story-to-code/` holds a small habit and focus tracker, its wiki, and the saved result of every stage of this flow, so you can see what each stage writes without building a project by hand. Its `README.md` explains it in full. The unbuilt features are on the sample wiki's Future Releases page, so a rerun always has a feature to add.

Build a mock repo from the sample, at the stage you want to start from, in Windows PowerShell:

```
toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage planned
```

The script builds `.scratch/mock-app/` as its own git repository on the branch `sample`, installs the toolkit there at project scope and runs `npm ci` inside it. It writes nothing outside that folder and calls no model. The stage is one of `baseline`, `proposed`, `accepted`, `planned`, `built`, `validated` or `archived`. To restore a different stage, run it again with `-Reset -Stage <name>`. Then start Claude inside `.scratch/mock-app/`.

A saved stage shows what the skills wrote on the day it was recorded, so only a live run proves an edited skill works. `node --test toolkit/tests/story/sample-stages.test.mjs` runs every saved stage through the toolkit's own checkers with no model, and fails when a skill's output format changes so that a stage no longer passes. The story-skill tests also read the sample's backlog and slice.
