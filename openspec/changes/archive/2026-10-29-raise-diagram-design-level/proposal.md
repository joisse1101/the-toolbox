## Why

`plan-stories` produces conceptual, business-level sequence diagrams ("log in", "start session", one merged "refused" branch) where design-level ones are needed: route, payload, status codes, datastores, token delivery, security behaviour, one branch per distinct failure. Four causes sit in the repo: the conventions never name a target level; analysis level (no repo) forbids the detail by design; even at repo level only the traceability table has to be grounded, not the diagrams; and the mock slice the conventions say to match is itself conceptual. `check_diagram` checks structure only, so a conceptual diagram passes.

The slice is meant to feed `openspec propose` and `apply` (read the stories and these documents, then go). It covers "what" (stories, scenarios, flows) but not "how and why" (decisions, contracts, failure responses, non-functional rules), so apply would have to ask or guess.

## What Changes

- Name the target level: every slice is **design-level and implementation-bound**; a conceptual diagram is a defect, with or without a repo.
- Redefine analysis level (no repo): the skill does not leave the diagram conceptual. It **asks the user** for each design decision the stories do not state, draws what the user confirms, and marks what is deferred `TBC`. It still never invents infrastructure, libraries or paths.
- Add a **design checkpoint** to `plan-stories`: after reading, and before drafting, the skill shows an outline (participants, contract per flow, failure branches) and asks its open decisions. One-shotting a slice is not the expected path.
- At repo level, require reading the real code (router, service, repository, entity, frontend page) before the outline, and anchor participant names to it.
- Add a completeness checklist and a self-check ("could a developer implement this and a tester derive cases from it? if not, go down a level"), and require one `alt` branch per distinct failure unless the code or the user says they merge.
- Add specification sections `## Design decisions`, `## Interface contracts`, `## Failure responses`, `## Non-functional and security rules`, `## Open questions`, and a `Steps` column in the acceptance-criteria table (AC to step ids).
- Build on `switch-diagrams-to-mermaid` (archived): a slice is one document `UC-<slice>.md` holding the specification and the Mermaid class and sequence diagrams, so the new sections, the `Steps` column and the checks below are written for that document.
- Add an **aggregate boundary** rule to the class diagram: each root entity is drawn in an aggregate boundary (a Mermaid `namespace`) with the classes it owns and one line naming the rule it protects, and a class outside the boundary points only at the root.
- Replace the mock slice with a design-level one built on the sample backlog.
- The new sections and the `Steps` column are required, and the checks are strict about them. No slice exists yet, so nothing is migrated.

Out of scope: the capability delta (ADDED/MODIFIED), grouping scenarios into SHALL requirements, a `tasks` step, and the repo-versus-diagram consolidation that would follow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagram-conventions`: design-level target, the completeness checklist, one branch per distinct failure, the aggregate boundary of the class diagram, the new specification sections and `Steps` column, the reworded no-repo rule, and a design-level mock slice.
- `plan-stories-skill`: the design checkpoint, ask-don't-guess, the self-check, and the read-first rule at repo level; the no-repo requirement is replaced.

## Impact

- `planner/guidelines/diagram-conventions.md`, `.claude/skills/plan-stories/SKILL.md`.
- `planner/logic/diagrams/checks.js` (heading list, `Steps` column, the no-repo `Maturity`/`TBC` rules, the aggregate boundary check) and its tests.
- `planner/test/sample-data/diagrams/sample/sign-in/` (mock slice rewritten).
- `diagram-writer` is unchanged: it applies whatever checks the conventions define.
