## 1. Guidelines

- [x] 1.1 Add section 7 "Edge cases" to `ai/guidelines/product-backlog.md`: the checklist, when each item does not apply, and the rule (implied by Title and I-want -> criterion; needs a decision or new scope -> Clarifications question). Verify the section exists and the file still has no restated rule elsewhere (`grep` the skills for the checklist wording finds nothing).

## 2. Mechanical checks (core)

- [x] 2.1 Create `core/backlog-checks.js` with `backlogChecks({ stories, lexicon, proposals })`, reusing `backlogProblems`, `storyIssues` (Priority dropped) and `lexiconProblems`, and adding: duplicate Epic/Feature/Title, overlap with a non-benched proposal, whole-word Avoid-word use in Title/User Story/criteria, and an answered but unresolved Clarifications pair. Locked stories are marked `locked`. Verify with `test/backlog-checks.test.mjs` covering each scenario of `backlog-consistency-checks` (dangling dependency, duplicate of a proposed story, benched proposal ignored, avoided word incl. "stable" not matching "table", locked context only, missing lexicon, answered pair, clean backlog); `npm test` passes.

## 3. Consistency Area

- [x] 3.1 Add `'Consistency'` to `AREAS` in `core/review.js`. Verify `test/review.test.mjs` accepts a finding with that Area, rejects an unknown Area naming the five allowed ones, groups Consistency rows in their own section in `reviewOverview` after the others, and omits it when empty; `test/story-tools-mcp.test.mjs` shows the Area in the `write_review` description; an old review file without such rows still loads.

## 4. Sectioned reader

- [x] 4.1 Rework `read-backlog.mjs`: no section prints the scope line and a menu with sizes (including `epic-<n>` per Epic in `groupByEpic` order); sections `guidelines`, `sizing`, `lexicon`, `proposals` (benched count noted), `checks` (scope line plus the report, one line per problem) and `epic-<n>` (header row plus that Epic's rows, locked included); unknown section or Epic number is an error listing valid ones; section names are matched against a fixed list, never used as a path; missing lexicon or proposals file reads as empty. Verify with `test/read-backlog.test.mjs` for the menu, one Epic, unknown section, `..`/separator rejection and the no-argument backlog list; `npm test` passes.
- [x] 4.2 Update `guard-bash.mjs` to allow `read-backlog.mjs <file> [section]` where section matches `[a-z]+(-\d+)?`, nothing else. Verify with `test/guard-bash.test.mjs` cases for an allowed section, a section with a path, `;`, `$(...)` and a third argument (all denied).

## 5. Skill

- [ ] 5.1 Rewrite `.claude/skills/review-backlog/SKILL.md`: read order (menu, `checks`, `lexicon`, `proposals`, `sizing`, then every `epic-<n>`); the mechanical report turned into rows; per-Epic cross-story pass (overlap, contradiction, role drift, lexicon use, proposal overlap, Feature/Epic delivers its name) with cross-Epic findings after the last Epic; the edge-case pass citing guidelines section 7 without restating it; `resolve` added to the action table and the `field`/`action` lists; `Consistency` as a review Area for cross-story, lexicon and proposal rows (dependency problems stay `INVEST`), added to the `area` list and the report headings; summary states Epics read; `allowed-tools` unchanged. Verify by reading the file against every scenario in the `backlog-review-skill` delta, and `node --test test/guard-bash.test.mjs` still passes.
- [ ] 5.2 Run the skill against a copy of a real backlog with `TLT_DATA_DIR` pointing at a scratch folder holding that backlog, a lexicon and a proposals file; verify the `checks` output lists the seeded problems (one dangling dependency, one avoided word, one proposal duplicate, one answered pair), every Epic is read, and `write-review.mjs` accepts the rows written.

## 6. Docs and specs

- [ ] 6.1 Update the review-backlog paragraph of `CLAUDE.md` (sectioned reader, `core/backlog-checks.js`, the lexicon/proposals inputs, the `Consistency` Area, `resolve`). Verify the paragraph names the new module and the reader sections.
- [ ] 6.2 Run `openspec validate review-backlog-consistency --strict` and `npm test`; verify both pass.
