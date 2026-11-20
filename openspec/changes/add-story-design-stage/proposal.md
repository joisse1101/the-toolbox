# Proposal

## Why

The story-to-code flow has no stage that settles how a feature looks and behaves before it is planned and built. When a user designed screens separately, Claude kept forgetting to check its work against them, so the user had to repeat where the design was. Nothing in plan, the tasks or the apply briefs carried the design forward, so a prompt reminder was the only link and it did not hold.

## What Changes

- Add a new story skill, `jois-story-design`, that runs after accept and before plan. It turns the accepted stories of one Epic, Feature or story into a Claude Design canvas: artboards that show page layout, element placement, copy, look and feel, and interactions such as scrolling, form filling and error messages.
- The canvas's first artboard, `Main`, is the **story index**. It maps every acceptance criterion of every story in scope to the artboards that show it, for people to read and as data that Claude and a checker read.
- By default each screen state gets two artboards: a desktop one sized for desktop and a mobile one sized for a phone.
- The design lives only in the canvas. The repo keeps one pointer per scope in `<backlog>/designs.json`, holding the canvas link and no design content, so the design cannot drift from a copy.
- Design shows the planned artboards and asks one yes/no before it creates or changes the canvas.
- Design can split or fix stories in the same way plan does. It offers the change through `jois-story-propose`, writes no story itself, and skips stories that still have an open clarification.
- The split, readiness and conflict rules move out of plan's `SKILL.md` into one shared guideline that both skills load, so the two skills cannot disagree.
- When the artboards are published, design reviews them. It checks visuals with the `jois-design-ui-principles` checklist and checks UX coverage against the story index: every criterion has an artboard, every failure criterion has an error state, and every flow clicks through. It fixes design problems itself for up to 2 rounds and offers story problems to `jois-story-propose`.
- A checker script compares the story index with the backlog and reports stories that changed, went missing or are new since the design was made, as plan does for slices.
- Plan reads `designs.json` and the story index, and writes a `Design:` line with the artboard links into every task that builds a screen. The plan writer refuses a slice whose screen tasks lack that line when the backlog has a design for the scope.
- `task-applier` and `code-validator` gain the `Artifact` tool. Each opens the `Design:` links of its task or claim, builds against them or judges against them, and never copies an artboard into the repo.
- The story-to-code sample gains a `designed` stage between `accepted` and `planned`. It holds only the pointer to one private sample canvas, which is created once with the user's approval and only read after that.

## Capabilities

### New Capabilities

- `story-design-skill`: the `jois-story-design` skill. It covers scope and readiness, the canvas and its story index artboard, the default desktop and mobile artboards, the `designs.json` pointer, the yes/no before publishing, splits and fixes through propose, the UI and UX review, and the stale-index check.

### Modified Capabilities

- `slice-tasks`: a task may carry a `Design:` line, and the writer requires one on every screen task when the backlog has a design for the slice's scope.
- `plan-stories-skill`: plan reads the design pointer and the story index, writes the `Design:` links, reports a stale design, and takes the split, readiness and conflict rules from the shared guideline.
- `toolkit-skills`: `task-applier` gains the `Artifact` tool and opens a task's `Design:` links before it writes any screen code.
- `code-validation`: a user-interface claim with a `Design:` link is checked against its artboards, and `code-validator` gains the `Artifact` tool to open them.
- `toolkit-story-skills`: the toolkit holds six story skills, with `jois-story-design` added.
- `story-to-code-sample`: a `designed` stage sits between `accepted` and `planned`.

## Impact

- New skill folder `toolkit/skills/jois-story-design/`, with its own `SKILL.md`, writer and checker scripts, and generated `lib/` and `references/` copies.
- New shared guidelines in `viewer/shared/guidelines/`: one for the split, readiness and conflict rules, and one for the design conventions (index format, viewports, artboard naming). `viewer/scripts/sync-skill-logic.ts` copies them into the skills.
- `toolkit/skills/jois-story-plan/`: `SKILL.md`, the task check in `diagrams/tasks.js`, and `write-diagram.mjs`.
- `toolkit/agents/task-applier.md` and `toolkit/agents/code-validator.md`: tool lists and rules.
- `viewer/shared/skill-support/plans-files.mjs` and the generated `plans-files.md`: a row for `designs.json`.
- `toolkit/sample/story-to-code/`: the build script, a `stages/designed/` folder and the README.
- Wiki pages: [Story to Code](../../../wiki/Story-To-Code.md), the Story Skills page and the Toolkit Guide.
- Outside the repo: a private Claude Design canvas on claude.ai per designed scope. The sample canvas is created once, only with the user's explicit approval.
