# Story to Code

This page follows one feature from an idea to merged code: the stages in order, what each one writes, and how to find the next command when you come back to the work later. Each stage has its own page with the detail, linked from its row. The flow uses the story skills of the planner and the `jois-code` commands of the toolkit, so install both first (see [Install](toolkit/Install.md)).

A **slice** is the unit the flow builds: a set of stories planned together into one folder, `<backlog>/slices/<slice>/`, holding the use-case document `UC-<slice>.md`, the build tasks `tasks.md` and `source.json`. A **backlog** is a folder of the planner's data folder that holds `user-stories.csv`.

## The stages

Start Claude in the code base folder, because the skills look for the data folder (`.plans`, or the folder `PLANNER_CONFIG` names) in the current folder only. Then run the stages in this order. Explore and review are optional, and every other stage needs the one before it.

1. **Explore** the idea with `jois-story-explore`. It discusses scope, splitting and acceptance criteria and writes nothing. See [Story Skills](planner/Story-Skills.md).
2. **Propose** the agreed stories with `/jois-story:propose`. It writes them to `<backlog>/user-stories/proposals.csv`.
3. **Accept** them in the portal's Proposed tab, which moves them into `<backlog>/user-stories.csv`. See [User Flows](planner/User-Flows.md).
4. **Review** the backlog with `jois-story-review` when you want a wider check. Apply or dismiss its suggestions in the portal's Review tab.
5. **Plan** a slice with `jois-story-plan`. It asks the design questions the stories leave open, writes the slice folder, freezes the stories it covers and then checks the slice with verify.
6. **Verify** the slice with `/jois-story:verify` if you changed it or its stories since it was planned. It reports what would break the build and fixes the slice only after you approve.
7. **Build** it with `/jois-code:apply slice <backlog>/<slice>`. Agents carry out the tasks one group at a time, and each finished group is committed on your branch. Before the tests the command reviews the code, fixes what the review finds for at most two rounds, and writes `review.md` into the slice folder. See [Task Agent](toolkit/Task-Agent.md).
8. **Validate** it with `/jois-code:validate slice <backlog>/<slice>`. Agents test each acceptance criterion against the running code and write `validation.md` into the slice folder. The slice is validated only when every claim is met.
9. **Archive** it with `/jois-code:archive slice <backlog>/<slice>`. It writes the slice into the wiki, one folder per topic with an overview, a reference and a design page, and marks the slice with `ARCHIVED.md`. It shows every page before it writes and stops at the commit rule's confirmation word. See [Command Details](toolkit/Command-Details.md).
10. **Open the PR** with `/jois-git:write-pr`. The wiki commit of the archive travels in the same PR as the code.

Archive refuses a slice that is stale, has an unticked task, a `TBC` decision or an open question, or whose validation is not current. So when archive stops, it names the stage to go back to, and you never have to guess whether the wiki matches the code.

## What each stage leaves behind

The slice folder lives in the data folder, which this flow does not commit: apply ticks `tasks.md` there, and validate, apply and archive write their result files there, but no command stages them. The code and the wiki are committed on your branch.

| Stage | Writes | Committed |
| --- | --- | --- |
| Propose | `<backlog>/user-stories/proposals.csv` | no |
| Accept (portal) | `<backlog>/user-stories.csv` | no |
| Plan | `<backlog>/slices/<slice>/` (`UC-<slice>.md`, `tasks.md`, `source.json`) | no |
| Build | the code, ticks in `tasks.md`, `review.md` | the code, one commit per group |
| Validate | `validation.md`, or `validation.partial.md` for one story | no |
| Archive | `wiki/<topic>/` pages, `ARCHIVED.md` | the wiki pages, after your confirmation word |

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

A `validation.partial.md` alone never counts as validated, because it tested one story only. An `ARCHIVED.md` from an earlier commit records an earlier archive, so after new code the slice is archived again, and the rerun replaces its block in the wiki in place.

When a story changes after the slice was planned, apply, validate and archive report the slice as stale and stop. Redraw it with `jois-story-plan` and run the stage again.
