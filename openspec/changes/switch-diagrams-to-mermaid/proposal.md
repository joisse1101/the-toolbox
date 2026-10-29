## Why

The diagrams are PlantUML files (`.puml`). The user wants them in Mermaid, which GitHub renders inside markdown and which VS Code renders through a markdown extension, with no PlantUML server or local Java and Graphviz to set up. The slice is also spread over five files (a specification, a class diagram and one file per flow); the user wants one document that describes a slice. Two changes that are not started yet, `raise-diagram-design-level` and `add-context-map`, write rules in PlantUML terms, so the switch is cheapest now and comes first.

## What Changes

- Every diagram is **Mermaid**: the class diagram, the sequence diagrams and, in `add-context-map`, the context map. No `.puml` file remains.
- A slice is **one document**: `UC-<slice>.md` holds the specification and every diagram, each in its own `mermaid` fence under its own heading. `source.json` stays a separate file (the tool owns it; the model never writes it).
- Rendering in GitHub and in VS Code (built-in markdown preview) is the target. Syntax is kept to what both render.
- **Colors are optional.** The palette check is removed. Stereotypes (`<<boundary>>`, `<<service>>`, ...) stay required, because they carry the meaning without color.
- The checks also run **Mermaid's own parser** on every fence (with a `jsdom` shim, on the skill side), so a diagram that cannot render is refused. A phase is a `rect` block with a `Note over` line.
- The checks (`planner/logic/diagrams/checks.js`) read the fenced blocks of the document instead of `.puml` files: one class diagram and one sequence diagram per flow, the declared-before-use rule, the step ids, the `alt` per failure, and the class limit.
- The `@startuml` name rule goes: a diagram is named by its heading, and the slice name is already unique in the backlog.
- The mock slice in `planner/test/sample-data/diagrams/sample/sign-in/` is rewritten as one document.
- Nothing is converted: no slice or `.puml` file of a user exists, so the new layout starts from scratch.

Out of scope: the design-level content rules and the aggregate boundary (`raise-diagram-design-level`, reworded for Mermaid after this change), and the context map (`add-context-map`, reworded the same way).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagram-conventions`: Mermaid and the one-document slice layout, no palette, the checks read fences, and the rendering section rewritten for GitHub and VS Code.
- `plan-stories-skill`: the skill drafts one document with fenced Mermaid diagrams instead of several files.
- `diagram-writer`: a slice is one document plus `source.json`; the write, check and read-back rules apply to that file set.

## Impact

- `planner/guidelines/diagram-conventions.md`, `.claude/skills/plan-stories/SKILL.md`.
- `planner/logic/diagrams/checks.js` and `limits.js` (fence parsing, palette removed from the `diagram-limits` block) and their tests.
- `planner/package.json` and its lockfile: new dependencies `mermaid` and `jsdom`, pinned, used only by the skill-side parser step (not by `planner/logic/` or the portal build).
- `planner/claude/mcp/diagram-tools.mjs` and the skill scripts `read-diagrams.mjs` and `write-diagram.mjs` (the file set of a slice).
- `planner/test/sample-data/diagrams/sample/sign-in/` (rewritten), the `plan-stories` and `diagram-conventions` paragraphs of `CLAUDE.md`, and the `README.md` line that says PlantUML.
- `raise-diagram-design-level` and `add-context-map` are reworded for Mermaid after this change is settled.
