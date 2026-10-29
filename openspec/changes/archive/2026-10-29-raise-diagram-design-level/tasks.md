## 1. Conventions

- [x] 1.1 In `planner/guidelines/diagram-conventions.md` add a section stating the design-level target, the self-check question and that a conceptual diagram is a defect; verify by reading that sections 1-7 still number consistently and no rule is stated twice.
- [x] 1.2 Add the completeness checklist (entry contract, validation layer, verification owner, datastores and ports, session or token artifact and delivery, each failure with its client response, security behaviour, redirect target) and the one-branch-per-distinct-failure rule, with not found, wrong credential, inactive, invalid input and rate limited named as prompts, not a closed list; verify by checking each item appears once.
- [x] 1.3 Rewrite section 4 (Specification): the new heading order, the five design sections and their table columns (`Design decisions`: id, decision, alternatives, why, source, steps; source is `user-confirmed`, `repo` or `TBC`), and the AC table with a sixth `Steps` column; verify the headings match the spec delta word for word.
- [x] 1.4 Rewrite section 5 as "limits without a repo": confirmed technology is recorded as a `user-confirmed` decision and may then be drawn, no file path without a repo (a path only if the user states it), `Maturity` stays `planned`, `Implementation overview` and `Traceability` stay `TBC`; verify no sentence still calls the no-repo level "analysis level" as a lower bar.
- [x] 1.5 In `planner/guidelines/diagram-conventions.md` add the aggregate boundary rule to section 3 (a namespace per root, one rule line, arrows from outside only into the root, stub shows the root only, namespace not counted in `maxClasses`); verify it matches the `Aggregate boundary` requirement word for word and states the Mermaid marker once.

## 2. Checks

- [x] 2.1 In `planner/logic/diagrams/checks.js` update `SPEC_HEADINGS` to the new list and order and verify a slice without `## Design decisions` fails with a message that names the missing heading.
- [x] 2.2 Make `checkSequence` in `checks.js` return the step ids it found per `### Sequence: <flow>` block and pass that flow-to-step-ids map into `checkSpec`; verify with a unit test that a step id is available per flow.
- [x] 2.3 Add the `Steps` column to the AC row check (six columns) and reject a step id that the row's flow does not contain; verify with tests for a missing column and an unknown id.
- [x] 2.4 Check the `Design decisions` table: required columns and a source of `user-confirmed`, `repo` or `TBC`, `repo` allowed only when a repo is given; verify with tests for a missing source and a bad source.
- [x] 2.5 Check that each of the five design sections is present and not empty (a section that does not apply says so); check that every `Failure responses` row names an AC id that exists in the AC table; verify with tests.
- [x] 2.6 Keep the existing `Maturity` and `TBC` rules and the no-repo file-path rule unchanged; verify the existing tests for them still pass.
- [x] 2.7 In `planner/logic/diagrams/checks.js` check the aggregate boundary of a class diagram (every root entity inside an aggregate namespace, a rule line in each, no arrow from outside into a non-root inner class), after a spike that confirms the namespace form (see D10); verify with tests for a root outside a namespace, a namespace without a rule and an arrow into an inner class.

## 3. Mock slice

- [x] 3.1 Rewrite the `### Sequence: login` and `### Sequence: reset` blocks of `planner/test/sample-data/diagrams/sample/sign-in/UC-sign-in.md` at design level with invented, repo-free content: entry contract, validation layer, credential owner, datastore, session artifact, one `alt` per distinct failure with the client response, security notes and phase-based step ids; verify it contains no real backlog or repo content.
- [x] 3.2 Rewrite `UC-sign-in.md` with the new sections, the `Steps` column and `user-confirmed` or `TBC` decision rows, keeping `Maturity` `planned` and the code sections `TBC`; update `source.json` only through the existing hash rule and verify the story list block is unchanged.
- [x] 3.3 Update the `## Class diagram` block of `UC-sign-in.md` if the participants it shares with the sequences changed; verify the class count is within the limit.
- [x] 3.4 Draw the `Member` aggregate in the `## Class diagram` block (a `MemberAggregate` namespace, rule line, `Email` and `Credential` inside, arrows from outside only to `Member`) and add its `## Design decisions` row; verify the mock passes the new check.

## 4. Tests

- [x] 4.1 Update `planner/test/logic/diagram-checks.test.mjs` for the new layout and add tests for each new rule of group 2; verify `node --test planner/test/logic/diagram-checks.test.mjs` passes.
- [x] 4.2 Update `planner/test/claude/diagram-scripts.test.mjs` and `planner/test/claude/diagram-tools-mcp.test.mjs` wherever they build or read a slice in the old layout; verify both pass.
- [x] 4.3 Add `diagram-checks.test.mjs` cases for the aggregate boundary against the mock slice and variants of it; verify `node --test planner/test/logic/diagram-checks.test.mjs` passes.
- [x] 4.4 Run `npm test` from `planner/` and verify the whole suite, including `zones.test.mjs`, passes.

## 5. Skill

- [x] 5.1 Edit `.claude/skills/plan-stories/SKILL.md`: add the design checkpoint between reading and drafting (outline, then questions with `AskUserQuestion`, a recommended option where defensible, "defer" accepted and drawn `TBC`); verify the Draft, Check/show/confirm and Write sections still read in order.
- [x] 5.2 Replace the "Analysis level" bullet with the design-level-without-a-repo rule (ask for every decision the stories do not state, never default, record answers as `user-confirmed` rows) and rewrite the "Repo level" bullet to read router, service, repository, entity and the frontend page first and anchor participant names to them; verify the text cites the conventions and does not restate them.
- [x] 5.3 Add the self-check ("could a developer implement this and a tester derive cases from it? if not, go down a level") and the rule that a merged failure branch needs a recorded decision, before "Check, show, confirm"; verify the skill says what is still open when it shows files that are not fully decided.
- [x] 5.4 Update the skill's `description` front matter and the Draft section so no instruction suggests drafting the whole slice in one pass; verify by reading the file top to bottom.

## 6. Docs and a real run

- [x] 6.1 Update the `plan-stories` and `diagram-conventions` paragraphs of `CLAUDE.md` for the design level, the checkpoint and the new sections; verify they match the specs and do not duplicate the conventions.
- [x] 6.2 Draw a slice with the updated skill (a manual check): confirm the checkpoint asks before drafting, the files pass `check_diagram` and the sequence reaches the level of the feedback (contracts, one branch per failure, session artifact, security behaviour).
