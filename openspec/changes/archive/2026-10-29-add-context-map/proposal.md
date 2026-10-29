## Why

`plan-stories` draws one slice (an Epic, Feature or story) at a time. Nothing records the boundaries between the areas of the product: which words mean the same thing where, who owns an area, and how one area depends on another. Conventions section 6 guesses the boundary per slice ("stories share a root entity"), and a slice that needs an entity of another Epic only gets a `(see <slice>)` stub. Stakeholders (architects, product owners) have no overview, and the slices have no agreed boundary to be cut from.

## What Changes

- Add a **context map** for a backlog: bounded contexts, the Epics each one holds, the relationships between contexts (customer/supplier, anti-corruption layer, shared kernel, conformist, published events), the owning team of each context, and what crosses each link.
- A context holds one or more Epics. An Epic is in exactly one context and is never split (it is a "domain area" by `product-backlog.md` section 1).
- The skill starts from one context per Epic and the user merges Epics that share terms and meaning. It asks for the owner, the relationship type and what crosses; the stories do not hold them.
- The map has a structured source that `plan-stories` can read, and a rendering for stakeholders in one markdown document: a table and a Mermaid context diagram (a flowchart with a subgraph per context and labelled links).
- A check refuses a map where an Epic of the backlog is in no context or in two.
- `plan-stories` reads the map when the backlog has one: a stub of an entity another context owns also states the link type. Without a map, the skill works as today. Drawing the map is a separate step inside `plan-stories`, not a new skill.
- The map is stored as two files at the backlog level (`context-map.json` and `context-map.md`) and read, checked and written by three new tools in `diagram-tools`.

Out of scope: event storming (the backlog is its lossy projection and a tool cannot reconstruct a board), the aggregate boundary rule for class diagrams (decided in `raise-diagram-design-level`), and any change to the design-level rules of a slice.

## Capabilities

### New Capabilities

- `context-map`: the structure, checks and renderings of a backlog's context map, and the skill steps that draw it with the user.

### Modified Capabilities

- `plan-stories-skill`: reads the map when one exists, has a step that draws it, and lists the read tool in `allowed-tools`.
- `diagram-conventions`: a new section for the map's rules, and the stub rule of section 3 gains the link type when a map exists. Section 6 is unchanged.
- `diagram-writer`: the diagram tools server gains the three map tools and writes the map at the backlog level.

## Impact

- New: three map files under `planner/data/diagrams/<backlog>/` (git-ignored), and logic in `planner/logic/diagrams/` for the map's structure and checks.
- `planner/guidelines/diagram-conventions.md` gains a section for the map.
- `.claude/skills/plan-stories/SKILL.md` (the map step, `allowed-tools`), `planner/claude/mcp/diagram-tools.mjs` (three tools) and the `plan-stories` launcher (the read tool pre-approved).
- No change to backlog, proposals, reviews or lexicon files.
