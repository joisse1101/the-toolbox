## Context

See proposal.md for motivation. Today `read-backlog.mjs` prints the guidelines, a scope line and the whole CSV in one go, and `guard-bash.mjs` allows `read-backlog.mjs` with at most one argument. The pieces for the mechanical checks mostly exist in `core/`: `backlogProblems` (ids.js: dangling, self, proposed-only and cyclic `Depends On`), `storyIssues` (model.js: missing fields, points, split), `lexiconProblems` (lexicon.js), `parseClarifications` (story-text.js) and `findStories`/`matchesQuery` (story-search.js). The writer's `AREAS` are `Hierarchy, INVEST, Acceptance criteria, Clarification`, and the portal builds its Review tab from them (`reviewOverview`).

## Goals / Non-Goals

**Goals:**
- One pure function that turns (backlog, lexicon, proposals) into a list of checked problems, tested without files.
- A reader that never has to print the whole backlog in one output.
- A skill that covers the judgement-only checks (overlap, contradiction, role drift, edge cases) one Epic at a time.

**Non-Goals:**
- No change to the review CSV columns, the Field/Action rules or the portal's components.
- No semantic duplicate detection in code (that is the model's job); the script only matches exact Epic > Feature > Title.
- The skill does not write the lexicon or the proposals, and `story-tools` MCP is not used by this skill (it keeps its locked Bash-only session).

## Decisions

**1. Mechanical checks live in `core/backlog-checks.js`, reusing the existing validators.**
`backlogChecks({ stories, lexicon, proposals })` returns `[{ storyId, title, locked, kind, message }]` (term problems use `term` instead of a story). It calls `backlogProblems`, `storyIssues` (errors and the points warnings only; Priority is dropped), `lexiconProblems`, and adds the new rules: duplicate Epic/Feature/Title, overlap with a non-benched proposal, an `Avoid` word found in Title, User Story or criteria, and an answered but unresolved Clarifications pair. Alternative: a new validator separate from the existing ones; rejected as it would drift from what the portal already warns about (DRY).
Avoid-word matching is whole-word and case-insensitive on the word or phrase, so "table" does not match "stable".

**2. Sections, not a dump, in `read-backlog.mjs`.**
`read-backlog.mjs <file> [section]`, section one of `guidelines | sizing | lexicon | proposals | checks | epic-<n>`. No section prints a menu (scope line, section names, sizes). `epic-<n>` indexes the Epics in `groupByEpic` order, printed as the menu shows them, so the Epic name (spaces, `&`) never has to pass the guard. This keeps `guard-bash.mjs` a one-line change: the second argument must match `[a-z]+(-\d+)?`. Alternative: serve the sections through the `story-tools` MCP like the story skills; rejected because the review skill's locked session is Bash with two allow-listed scripts, and moving it would also change its permission model.
`lexicon` and `proposals` are read from the named backlog's own files (`lexicons/<name>`, `proposals/<name>`) via the same name rules; benched proposals are left out with a count, as `read_context` does.

**3. Epic-by-epic review with a read-everything rule.**
The skill reads the menu, then `checks`, `lexicon`, `proposals`, `sizing`, then each `epic-<n>`, reviewing and writing a batch per Epic (the writer already takes batches). Cross-Epic findings (same Feature under two Epics, overlap between Epics) are made after the last Epic, when every Epic has been read. The summary states how many Epics were read, so an incomplete run shows. Alternative: one big read with a size warning; rejected, the truncation risk is the problem.

**4. "Consistency" is a fifth Area.**
Added to `AREAS` in `core/review.js`; the writer's validation, the MCP tool description and the Review tab sections all read that list, so they follow without further code (the tab builds its sections from `AREAS`). Rows from the cross-story, lexicon and proposal checks take it; a dependency problem stays `INVEST`. Alternative: a report-only heading with rows on the four existing Areas; rejected because role drift, avoided words and overlaps fit none of them, and the portal could not group what the cross-story pass found. Check the Review tab hides an empty section, since four reviews in five will have no Consistency rows.

**5. Edge-case checklist is a guidelines section, classified by one rule.**
Added as section 7 of `product-backlog.md`: the cases, when each does not apply, and the rule "implied by Title and I-want -> criterion; needs a decision or new scope -> Clarifications question". The skill cites it, and `explore-stories`/`propose-stories` may cite it later. This is the existing "must not grow the story" rule applied to criteria.

**6. `resolve` from the review skill.**
The checks report answered-but-unresolved pairs (certain); the skill also reads Notes for an open question already answered (judgement). Both become `resolve` rows. The writer already accepts them (`ALLOWED_ACTIONS.Clarifications` includes `resolve`); only the skill text and the `backlog-review-suggestions` wording change.

## Risks / Trade-offs

- [False positives from Avoid-word matching on a phrase used in a quote] -> report it as a finding with `confirm` confidence rather than `ready`.
- [Exact-match duplicate check misses near-duplicates] -> the cross-story pass covers those; the script's job is only the certain cases.
- [More reading per review: five sections plus one per Epic] -> each is small, and the summary of Epics read makes a skipped one visible.
- [The skill relies on the model reading every Epic] -> the menu lists them with sizes and the report must state the count; a mismatch is visible to the user.
- [Guard allow-list widened] -> only a fixed section grammar after the file name; still no shell syntax, no path.

## Migration Plan

No data migration. The old form `read-backlog.mjs <file>` changes from "print everything" to "print the menu"; the only caller is the skill, updated in the same change. Rollback is reverting the commit.
