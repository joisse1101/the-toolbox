## Context

A slice is five or more files in `planner/data/diagrams/<backlog>/<slice>/`: `source.json`, `UC-<slice>.md`, `UC-<slice>-class.puml` and one `UC-<slice>-<flow>-sequence.puml` per flow. `check_diagram` and `write_diagram` apply `planner/guidelines/diagram-conventions.md` through `planner/logic/diagrams/checks.js`, which parses PlantUML line by line (`@startuml` / `@enduml`, declaration kinds, `«stereotype»` plus `#color`, `== Phase n ==` dividers, `alt`). See proposal.md - Why.

`raise-diagram-design-level` and `add-context-map` are not started; both write PlantUML-specific rules (an `«aggregate»` rectangle, a palette per layer, `context-map.puml`).

## Goals / Non-Goals

**Goals:**
- One document per slice, readable top to bottom, with every diagram inside it.
- Diagrams render in GitHub and in VS Code's built-in markdown preview, with no server and no extra tool to install.
- The checks keep their structural rules (declared before use, step ids, an `alt` per failure criterion, the class limit) on the new format.

**Non-Goals:**
- New content rules: the design level, the aggregate boundary and the context map are the other two changes.
- Reading or migrating PlantUML slices: none exist, so the checks know only the new layout.
- Judging a diagram's meaning. The checks stay structural.

## Decisions

Confirmed with the user:

**D1. A separate change, done first.** Nothing is built yet, so the two open changes are reworded once, afterwards. Alternative: fold it into `raise-diagram-design-level`. Rejected: that change would mix two reasons to change.

**D2. Mermaid replaces PlantUML for every diagram**, including the context map of `add-context-map`.

**D3. Colors are optional; stereotypes are not.** The palette check and the `palette` entries of the `diagram-limits` block go away. A stereotype is still required on every class and participant, written in the label, so the layers read without color. A diagram may style itself; no check reads it.

**D4. The diagrams live inside markdown, in `mermaid` fences.** GitHub and the VS Code markdown extension render a fence in a `.md` file. A standalone `.mmd` file is not assumed to render in both. Alternative: one `.md` file per diagram. Rejected in favour of D5.

**D5. One document per slice.** `UC-<slice>.md` holds the specification and every diagram, each fenced under its own heading, one class diagram and one sequence diagram per flow. `source.json` stays a separate file. The acceptance-criteria `Flow` column names a flow heading of the same document. The context map follows the same pattern: `context-map.json` and `context-map.md`, the markdown holding the table and the diagram.

**D8. The checks run Mermaid's own parser on every fence.** `check_diagram` and `write_diagram` pass each fenced diagram to `mermaid.parse` and report its error with the line, so a diagram that cannot render is refused before the user sees it. Mermaid's parser needs a DOM, so it runs with a `jsdom` shim (probed: class diagram with `<<stereotype>>` and `namespace`, sequence diagram with `box`, `rect`, `Note over` and `alt`, and a flowchart with subgraphs and labelled edges all parse; a broken diagram is rejected with a line number). `mermaid` and `jsdom` become dependencies of `planner/package.json`. The parser step lives on the skill side (`.claude/skills/plan-stories/`), because `planner/logic/` is pure and has no DOM; `planner/logic/diagrams/` only finds the fences and applies the structural rules. The parser version is pinned. Alternative: structural checks only. Rejected by the user: they accept a diagram that Mermaid cannot draw.

**D9. A phase is a `rect` block with a `Note over` line.** The note names the phase (`Phase 1 - <name>`) and the check reads the phase from it. Mermaid has no `== Phase ==` divider. Alternative: a `Note over` line alone. Accepted by the user as my recommendation; the form is tried in GitHub and in VS Code before the conventions rely on it.

Also confirmed with the user (second round):

**D6. The check reads fences, one diagram per fence.** A diagram is identified by its heading (`## Class diagram`, `### Sequence: <flow>`), and a heading with no fence, or a fence under no recognised heading, is a problem. The old `@startuml` name rule is dropped: the heading names the diagram and the slice name is already unique in the backlog. Alternative: keep the unique-name rule through a Mermaid `title`. Rejected: nothing else needs it.

**D7. Step ids stay `phase.step` in the message text.** Mermaid's `autonumber` counts whole numbers only, so ids such as `1.3` and the primed `1.6'` are written in the message, as now. The check reads them from the text.

## Risks / Trade-offs

- [A diagram that the structural checks accept but Mermaid cannot parse shows an error where the picture should be] -> the parser runs on every fence (D8) and refuses it.
- [GitHub and the VS Code extension may ship different Mermaid versions from the pinned parser, so a diagram can parse here and differ there] -> keep to a basic subset (class, sequence, flowchart with subgraphs and labelled edges), and test the mock slice in both before the conventions rely on a feature.
- [Two new dependencies, `mermaid` (many packages) and `jsdom`] -> they are used only by the skill-side check, pinned, and kept out of `planner/logic/` and the portal build; the zones test confirms nothing else imports them.
- [One long document] -> the confirm step can split a long document by section, as today for several files; the class limit still holds.
- [Mermaid has no `== Phase ==` divider] -> a `rect` block with a note (D9).
- [A redraw of one flow rewrites the whole document] -> accepted; `read_diagrams` still reports what changed so only that part is shown.

## Open Questions

None blocking.

Can wait:
- Whether the conventions keep an optional suggested palette as a styling hint. Nothing reads it.
- How section 7 of the conventions (rendering and the privacy of a public renderer) is worded once the viewers are GitHub and a local VS Code extension.
