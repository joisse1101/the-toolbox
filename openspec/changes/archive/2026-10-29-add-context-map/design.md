## Context

A slice (`UC-<slice>.md`, a class diagram, sequence diagrams, `source.json`) is drawn per Epic, Feature or story and checked by `check_diagram` against `planner/guidelines/diagram-conventions.md`. Nothing sits above the slices. The only cross-boundary signals today are the `(see <slice>)` stubs (section 3) and the shared-root-entity rule for choosing a scope (section 6). See proposal.md - Why.

The backlog rules (`product-backlog.md` section 1) define an Epic as "a domain area of the product" and a Feature as belonging to exactly one Epic. That is the ground for the decisions below.

## Goals / Non-Goals

**Goals:**
- One map per backlog that a stakeholder can read and `plan-stories` can read.
- Every Epic is in exactly one context, checkable.
- Content the stories do not hold (owner, relationship type, what crosses) comes from the user, by question, never by default, as in `raise-diagram-design-level` D2.

**Non-Goals:**
- Event storming, aggregate boundaries, and a context per Feature.
- `check_diagram` judging whether a context split is a good one. The code checks facts only (every Epic in exactly one context). The skill advises, with a reason drawn from the lexicon and the stories, and the user decides.

## Decisions

Confirmed with the user:

**D1. The strategic layer is a context map; event storming is not built.** The backlog already holds part of a board (actor, command, hotspots as Clarifications, language as the lexicon) but not events, policies or time order, and the direction is reversed (a board comes first and stories are cut from it). Alternative: a derived event timeline. Not now; if it returns it is a view with events as a decision row, not a new diagram family.

**D2. Two readers, one source.** The map is a stakeholder artifact and an input to `plan-stories`. A structured source (like `source.json`) is the checked content; one markdown document holding a table and a Mermaid diagram renders it, so the two never disagree. Alternative: a diagram only. Rejected: the skill could not read it reliably.

**D3. An Epic is never split between contexts.** Each Epic is in exactly one context. Ground: an Epic is one domain area (`product-backlog.md` section 1). A real Epic that mixes areas is a backlog defect to fix there, not a case the map handles.

**D4. A context may hold several Epics.** The user can merge Epics that use the same terms with the same meaning. The check stays "every Epic of the backlog is in exactly one context". Alternative: strictly one context per Epic. Rejected: a domain area is not always a bounded context, and a forced one would draw a boundary that is not there.

Confirmed with the user (second round):

**D5. Start from one context per Epic.** The skill proposes the outline from the backlog's Epics and the user merges and renames.

**D6. Ask for owner, relationship type and what crosses.** Relationship types: customer/supplier, anti-corruption layer, shared kernel, conformist, published events. A deferred answer is shown as `TBC`, as in `raise-diagram-design-level`.

**D7. A separate change.** The map covers a whole backlog, a slice covers one scope, so this does not extend `raise-diagram-design-level`.

Also confirmed with the user:

**D8. `plan-stories` reads the map when one exists.** Conventions section 6 stays as the fallback and is not replaced: an Epic is never split between contexts, so the map does not change which scope is recommended. What the map adds is for stubs: a stub of an entity another context owns also states the link type between the two contexts (for example a customer/supplier link, or an anti-corruption layer adapter). The map is optional per backlog, as `repo.json` is, and a backlog without one works as today.

**D9. Two files at the backlog level, no folder.** `planner/data/diagrams/<backlog>/context-map.json` (the checked source) and `context-map.md` (the table and the `mermaid` diagram, one document as a slice is), next to `repo.json`. A folder would be listed as a broken slice, because `listSlices` in `read-diagrams.mjs` lists every folder of the backlog's diagrams directory. Alternative: a `context-map/` folder with its own marker. Rejected: it changes how slices are found.

**D10 (of this change). Tools in `diagram-tools`.** A read, a check and a write tool are added to the existing server, following `read_diagrams`, `check_diagram` and `write_diagram`. The read tool is pre-approved by the launcher and listed in the `allowed-tools` of `.claude/skills/plan-stories/SKILL.md`; the write tool asks the user each time, as `write_diagram` does. Alternative: a second server. Rejected: the session already starts `diagram-tools`, and a second server adds a ready file for the launcher to wait for.

**D11. Drawing the map is a separate step inside `plan-stories`.** It is not a new skill. The step comes before the slice steps and is entered when the user asks for the map, or when a backlog has Epics and no map. Alternative: a skill of its own. Rejected by the user.

**D12. The map's rules are a new section of `diagram-conventions.md`.** The file already holds the stereotypes and the limits block that `limits.js` reads, so a second file would risk a second copy of them. Alternative: a sibling guideline. Rejected.

**D13. The writer generates `context-map.md` from `context-map.json`.** The model sends only the structured source; the writer composes the table and the `mermaid` flowchart (a subgraph per context, a labelled link per relationship, upstream to downstream) and runs the parser on it. The two cannot disagree, and the model is not asked to draw a flowchart by hand. Alternative: the model writes both. Rejected: it adds a check that the table and the diagram agree. Proposed as a default; change it before the tasks are applied if you want to draw the diagram yourself.

**D14. What the source holds.** `contexts`: `name`, `purpose`, `owner`, `epics` (names), and a `reason` when a context holds more than one Epic. `relationships`: `from` (upstream), `to` (downstream), `type` (customer-supplier, anti-corruption-layer, shared-kernel, conformist, published-events, or `TBC`) and `crosses` (what passes the link, or `TBC`). `owner` may be `TBC`. Proposed as a default.

D10 of `raise-diagram-design-level` is a different decision (the aggregate boundary); the two changes number their decisions separately.

## Risks / Trade-offs

- [The map goes stale when Epics are added, renamed or deleted] -> compare the map with the backlog's Epics on read and report the difference, as `read_diagrams` does for stories.
- [Many questions for a user with few opinions] -> start from the Epic outline, offer a recommended answer, accept "defer".
- [A merged context hides a real boundary] -> a merge is a recorded decision with its reason, not a default.

## Open Questions

None blocking. The aggregate boundary is not open: it is decided and sits in `raise-diagram-design-level` (D10 there). The Mermaid support of `switch-diagrams-to-mermaid` is in place (archived): the map is a markdown document with a Mermaid diagram, checked with the same parser (`parse-mermaid.mjs`). The theme init line that sequence diagrams must open with does not apply to the map's flowchart, which the writer generates.
