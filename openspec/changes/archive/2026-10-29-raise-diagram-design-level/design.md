## Context

With `switch-diagrams-to-mermaid` archived, a slice is `source.json` and one document `UC-<slice>.md` holding the specification and the Mermaid class and sequence diagrams, each in its own `mermaid` block under its own heading. It is drawn by `plan-stories` and checked by `check_diagram` against `planner/guidelines/diagram-conventions.md` (see the proposal for the problem). Today the no-repo path is "analysis level": no path, library or infrastructure that no story names, `Maturity` `planned`, `Implementation overview` and `Traceability` `TBC`. The checks (`planner/logic/diagrams/checks.js`) enforce structure (headings, stereotypes, step ids, one `alt` per failure criterion, the AC table) and nothing about detail. The mock slice the conventions say to match is conceptual.

The long-term aim is for `openspec propose` and `apply` to read the stories and a slice and go on from there. A later, separate step will consolidate diagrams and repo into tasks; this change only makes the slice communicative enough.

## Goals / Non-Goals

**Goals**
- A slice is design-level with or without a repo: a developer can implement from it and a tester can derive cases from it.
- Without a repo, every design decision comes from the user, by question, not from a default.
- The slice carries what an OpenSpec design needs: decisions with alternatives, contracts, failure responses, non-functional rules, open questions, and a link from each criterion to its steps.

**Non-Goals**
- The capability delta (new versus modified), SHALL requirement grouping, tasks, and the repo consolidation step.
- Judging "design-level" semantically in `check_diagram`. It can check structure; the skill's checkpoint and self-check carry the rest.

## Decisions

**D1. One level, design, for every slice.** The conventions state that a conceptual diagram is a defect. "Analysis level" is no longer a lower bar; what differs without a repo is the source of the detail (the user) and the code-bound sections (`Implementation overview`, `Traceability` stay `TBC`). Alternative: keep conceptual as the no-repo baseline and let the user ask for more. Rejected: it is what produced the feedback, and it makes the user pull the detail out.

**D2. Ask, then draw; never default.** The skill adds a *design checkpoint* between reading and drafting: it shows an outline (participants, contract per flow, failure branches, the decisions it cannot ground) and asks the open decisions with `AskUserQuestion` where the choice is real. An answer becomes a row of `## Design decisions` with source `user-confirmed`; a deferred one is drawn as `TBC` and listed under `## Open questions`. The skill still writes nothing until the existing yes/no. Alternative: draft in one pass and let the user correct. Rejected by the user: one-shotting a diagram is not expected.

**D3. Decisions live in a new `## Design decisions` section, not in `## Implementation overview`.** Each row: `D-id`, decision, alternatives, why, source (`user-confirmed`, `repo` or `TBC`), steps affected. It maps to a `design.md` decision. `Implementation overview` stays the code-bound overview a repo fills, so the two do not share a meaning. Alternative: reuse `Implementation overview` (fewer heading changes). Rejected by the user in favour of a clean section.

**D4. Five new sections and a `Steps` column.** `## Design decisions`, `## Interface contracts` (per flow: method and path or message, request, success response, steps), `## Failure responses` (trigger, client-visible response, AC id, step), `## Non-functional and security rules` (rule, source, steps) and `## Open questions` (item, blocking yes/no). The AC table gains `Steps`, the step ids that realise the criterion, so apply can go from a criterion to its design. Heading order: after `## Acceptance criteria`, in the order above, then `## Implementation overview` and `## Traceability`.

**D5. One `alt` branch per distinct failure.** Not found, wrong credential, inactive account and so on each get a branch and a row in `## Failure responses`, unless the user (or the repo, at repo level) says the responses are deliberately the same; then the merge is stated in the row (a merge for anti-enumeration is a decision, not a shortcut).

**D6. Read first at repo level.** With a repo, the skill reads router, service, repository, entity and the frontend page before the outline, and participant names carry the anchor (`SignInForm (auth/login/page.tsx)`). Without a repo, participants use the lexicon's terms plus names of technology the user has confirmed; a file path appears only if the user states it.

**D7. Completeness checklist and self-check live in the conventions, checked by the skill.** Per flow: entry contract, validation layer, credential-verification owner, datastores and ports, session or token artifact and its delivery, each failure with its client-visible response, security behaviour, redirect target. Before showing the files the skill asks itself: could a developer implement this and a tester derive cases from it? If not, go down a level (and ask). A lint in `check_diagram` (a flow with fewer `alt` branches than failure criteria already exists; a contract row empty for a flow) is the structural part; a semantic check is not attempted.

**D8. Strict layout, nothing to migrate.** The heading list and the AC column are strict: a slice missing a section or the `Steps` column fails `check_diagram` and the message names the heading. No slice exists yet, so there is no old layout to read, report or migrate.

**D9. Replace the mock slice** with a design-level one on the sample backlog (sign-in, reset), with real-looking but invented routes and decisions, kept free of any real backlog or repo content. The checks' tests read it.

**D10. Aggregate boundary in the class diagram.** Each class with the `root entity` stereotype is drawn inside a Mermaid `namespace` named after the root and ending in `Aggregate` (for example `MemberAggregate`), together with the classes it owns (entities and value objects it holds). One line inside the namespace (a note) names the rule the aggregate protects, for example "a member has one credential". A class outside the namespace points only at the root; an arrow into a class inside it is refused. The namespace is not a class, so it does not count toward `maxClasses`. A shared-class stub (section 3) shows only the root of the aggregate another slice owns, which is consistent with the rule. The rule is also recorded as a row of `## Design decisions` (source `user-confirmed`, `repo` or `TBC`), so it reaches `openspec apply`. Alternatives: a new diagram type for aggregates (rejected: the class diagram already holds the same classes); no check, convention text only (rejected: the existing checks show a convention without a check is not kept). The `namespace` marker is a recommendation; before the check is written, a spike confirms that a note can sit inside a namespace, that the namespace draws in GitHub and in the VS Code preview, and that the check can tell which class a relationship ends in. The check is structural: it reads the namespace and the arrows, and does not judge whether the rule is a good one.

## Risks / Trade-offs

- A user with few opinions gets many questions. The checkpoint groups them by flow, offers a recommended answer where one is defensible, and accepts "defer" (drawn as `TBC`, listed in Open questions).
- `TBC` can spread until the diagram is conceptual again. The self-check and a count of open blocking questions shown with the files keep it visible.
- "Design-level" is partly judgement. The structural checks catch empty sections, a missing `alt` or a missing `Steps` cell, not a vague message. The checkpoint is the main control.
- An aggregate boundary and a rule line add clutter and one more question per root (what does it protect?). The checkpoint asks it once per root and accepts "defer" (drawn `TBC`, listed in Open questions), and the namespace does not count toward the class limit.
- The new sections add reading and writing cost per slice; the 12-class limit still holds, and long slices can be confirmed in parts as today.

## Open Questions

None blocking. Resolved with the user:

1. **Maturity without a repo:** stays `planned`; the design-level claim rests on content.
2. **What counts as one failure:** the checklist names common kinds (not found, wrong credential, inactive, invalid input, rate limited) as prompts, not a closed list.
3. **Participant names without a repo:** lexicon terms plus confirmed technology names only; no placeholder file path, even marked `TBC`. A path appears only if the user states it.
