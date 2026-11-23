# Design

## Context

See proposal.md for why. The flow today is explore, propose, accept, plan, apply, validate and archive. Plan turns accepted stories into a slice (`UC-<slice>.md`, `tasks.md`, `source.json`) through writer scripts that check everything before writing. Apply hands each group of tasks to the `task-applier` agent with the verbatim task text, so whatever a task line holds reaches the agent unchanged.

These facts constrain the approach:

- **A Claude Design canvas is a set of files.** `project/canvas.json` indexes the artboards and their pages. Each artboard is one `project/<name>.dc.html` file. An artboard has its own link, `<canvas url>#artboard-<name>`, a flow plays from `#play-<name>`, and the first artboard in `order` (`Main.dc.html`) opens first.
- **Subagents can use the Artifact tool.** On 2026-11-20 a general-purpose Sonnet subagent called `Artifact` with `action: read` and got the result with no setup. A custom agent whose frontmatter lists `Artifact` has not been tested yet.
- **Node scripts cannot reach the canvas.** Only Claude can read it, through the Artifact tool. A script can check the index only when Claude hands it over.
- **Story skills write only through their bundled writer scripts**, and shared logic lives in `viewer/shared/` with generated copies in each skill (`viewer/scripts/sync-skill-logic.ts`).
- **The user's rules forbid publishing to a real system to test** without explicit approval, and forbid files outside the project.

## Goals / Non-Goals

**Goals:**

- Make "where is the design for this task" a fact that a writer script checks, not something Claude has to remember.
- Keep exactly one copy of the design: the canvas.
- Let plan, apply and validate run with subagents against a real canvas.

**Non-Goals:**

- Making design required. A backend-only scope needs no canvas, and plan only mentions a missing one.
- Rendering or screenshotting artboards in the review. The Design type forbids it unless the user asks, and the canvas sits behind the user's claude.ai login.
- A portal (viewer) screen for designs. The portal does not show `designs.json` in this change.
- A `/jois-story:design` command. Plan has none either, and the skill can be invoked by name.

## Decisions

### D1. The story index is data inside `Main.dc.html`

`Main` holds the index as one object literal returned by its component's `renderVals()`. The artboard renders the same object as the readable table with `<sc-for>`. People, Claude and the checker therefore read one source.

The object's shape:

```json
{
  "version": 1,
  "backlog": "habits",
  "scope": { "type": "feature", "epic": "Habits", "feature": "Streaks" },
  "viewports": ["desktop", "mobile"],
  "stories": [
    {
      "title": "See my current streak",
      "criteria": [
        {
          "text": "Given ... when ... then the card shows the current streak",
          "kind": "main",
          "artboards": ["streaks-card-default-desktop", "streaks-card-default-mobile"]
        }
      ]
    }
  ]
}
```

Criteria are keyed by their verbatim text, because a slice's AC ids are assigned by plan later and do not exist yet. `kind` is `main` or `failure`, and lets the checker require an error-state artboard for each failure criterion. Artboards are named by their file stem, and the full link is `<canvas url>#artboard-<stem>`.

Alternatives considered:

- **A separate `project/story-index.json` in the canvas.** An artboard cannot fetch a canvas file, so `Main` would need a second hand-kept copy of the table. Two sources in one canvas drift.
- **The index in the repo.** The user ruled out design content in the repo, for the same drift reason.

The first task is a spike that confirms the Design format renders an index from `renderVals()` and that Claude can read the object back from the file. If the format refuses it, the fallback is a `<script type="application/json">` block in `Main`, with the table written out in markup and the checker comparing the two.

**Spike result (2026-11-20, task 1.2):** a private throwaway canvas took a `Main.dc.html` whose `renderVals()` holds the index as `const index = { ... };` and renders it with three nested `<sc-for>` loops. The publish was accepted, and `action: read` with `path: project/Main.dc.html` returned the file byte for byte. The object, written as strict JSON (double-quoted keys, no comments, no trailing commas), was cut out by finding `const index = ` and scanning to its matching brace outside strings, and `JSON.parse` read it whole. So the object can be read back from the file and **no fallback is in use**. Two limits: the render itself was not looked at, because the Design type forbids checking a canvas unless the user asks, and the rule that the index must be strict JSON goes into `design-conventions.md`. The spike also showed that a link inside an artboard must name the target's file (`<a href="<stem>.dc.html">`), because `#…` only scrolls inside the same artboard; `<canvas url>#artboard-<stem>` is the link from outside the canvas.

### D2. `designs.json` is a pointer, written by a writer script

`<backlog>/designs.json` holds `{ "designs": [{ "scope": {...}, "url": "<canvas url>" }] }`, one entry per designed scope. `write-design-pointer.mjs <backlog> [--check]` takes one entry as JSON on standard input, refuses a second entry for the same scope with a different URL, writes atomically and reads back, like the other writers. The file is `committed` in the plans-file table, so the next person's plan finds the canvas.

A pointer per backlog, rather than a field on each story, keeps the backlog CSV unchanged and needs no portal work.

### D3. One index checker, shared by design and plan

The comparison of an index with the backlog lives in `viewer/shared/skill-support/design-index.ts` and is copied into both skills by the sync script. Each skill runs it through its own script (`check-design-index.mjs`), with the index on standard input. It reports:

- **stale:** a story that is changed, missing or new by Title and criterion text, the same categories as `read-diagrams.mjs`
- **coverage:** a criterion with no artboard, or a failure criterion with no artboard whose stem holds `error`

Whether each flow plays through needs the artboards' prototype links. The script cannot see those, so Claude checks it in the review and the checker does not claim to.

### D4. The plan writer checks the design links

`write-diagram.mjs` accepts an optional `design: { "url", "index" }` field in its input. `diagrams/tasks.js` matches each index criterion to a row of the slice's acceptance-criteria table by verbatim text, then applies the two new rules in the `slice-tasks` delta. The writer also reads `designs.json` itself. When the file links the scope and the input has no `design` field, the writer refuses the slice, so plan cannot skip the design by leaving the field out.

### D5. Artboard naming and viewports

Artboards are named `<flow>-<screen>-<state>-<viewport>`, for example `signup-form-error-mobile`, with one canvas page per flow. The desktop artboard is a fluid page (`expand: "fill"`) 1440 px wide. The mobile artboard is a fixed 390 x 844 frame. Those are the Design type's own sizes for a page and a phone. The rules live in a new shared guideline, `design-conventions.md`, copied into the design and plan skills.

### D6. One shared guideline for story changes

The rules for splitting a story, leaving out a story that is not ready and handling conflicts move from plan's `SKILL.md` into `viewer/shared/guidelines/story-changes.md`. The sync script copies it into both skills as `references/story-changes.md`. Plan's `SKILL.md` keeps one line that cites it. This is a move of text, so each rule and each "because" in the old sections has to survive it.

### D7. Agents read artboards live, into `.scratch/`

`task-applier.md` and `code-validator.md` add `Artifact` to `tools:`, and each gets one rule: open every link in a `Design` line before writing or judging that screen. A read that saves a file passes `out_dir` under `.scratch/artifacts/`, which is git-ignored. Apply needs no logic change, because it already copies task text verbatim. Its spec now says the `Design` line is part of that text.

**Spike result (2026-11-20, task 1.1):** the mock repo was built at `baseline`, and the project copy of `task-applier.md` got `Artifact` in `tools:` and a marker word in its description. Three findings:

- **The project copy of an agent loads ahead of the global one.** A headless session started in the mock repo quoted the description with the marker and listed `Artifact` in the agent's tools. This is the opposite of skills, where the global copy wins.
- **A headless session (`claude -p`) has no `Artifact` tool at all.** The dispatched `task-applier` saw only Read, Grep, Glob, Edit, Write and Bash, even with `ToolSearch` added to its list. A `general-purpose` agent and the headless main session itself had no `Artifact` either, and `ToolSearch` for `select:Artifact` found nothing.
- **An interactive session's agents do get it.** A `general-purpose` Sonnet agent dispatched from an interactive session had `Artifact` loaded directly and read the spike canvas's `project/canvas.json`.

What stayed untested then is a custom agent that lists `Artifact`, dispatched from an interactive session, because agent files are read only when a session starts and the global copy cannot be edited without the user's approval. **Checked later the same day:** with the edited `task-applier.md` installed at project scope and the session restarted, a dispatched `task-applier` had `Artifact` and read the spike canvas's `project/canvas.json`. The live run of tasks 6.2 and 6.3 then ran design, plan, apply, validate and archive in an interactive session, with each stage's agents opening the artboards.

### D8. The review uses the UI skill plus the checker

Design loads `jois-design-ui-principles` with the Skill tool and applies its visual checklist to each artboard's markup, skipping its React structure rules. It then runs `check-design-index.mjs` for coverage and checks the prototype links itself. The fix loop copies plan's verify loop: up to 2 rounds, no second yes/no, and story problems go to propose.

## Risks / Trade-offs

- **A custom agent may not get the Artifact tool from its frontmatter.** → A spike in the mock repo runs `task-applier` at project scope first. If it fails, apply's main session reads the artboards and passes their markup in the brief, which costs main-session context but keeps the flow working. **After the spike (task 1.1):** the fallback is needed only where the agent reports no `Artifact` tool. In a headless session nothing has the tool, so the fallback cannot help there either: design, and any stage that opens artboards, runs only in an interactive session.
- **People edit the canvas by hand and can break the index object.** → The checker refuses an index it cannot parse and names the line. Design and plan both stop and say so, rather than guess.
- **The sample canvas is private to the account that made it.** → The README says the `designed` and later stages need the canvas, and that another person records their own, with approval.
- **Agents opening large artboards use tokens.** → A task names only its own criteria's artboards, so an agent opens two or so per task, never the whole canvas.
- **Plan stops on a stale design, which adds a step after every accepted split.** → This is deliberate. A stale link points a task at the wrong screen, and that is the failure this change exists to prevent.
- **A global copy of a skill or agent loads ahead of the project copy.** → Live tests run in `.scratch/mock-app/` and first check which copy loads, as CLAUDE.md says. Global copies are never touched without asking.

## Migration Plan

Nothing migrates. Existing slices have no `Design` lines, and the new rules apply only when `designs.json` links the slice's scope, which no backlog has yet. Rolling back means removing the skill folder and reverting the plan writer and the two agent files. A `designs.json` left behind is ignored by an older plan.

## Open Questions

- Whether 1440 px or 1280 px suits the user's projects better as the desktop width. Either value fits the Design type's page range, and changing it touches only `design-conventions.md`.
