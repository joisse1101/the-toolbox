## Context

See proposal.md for why. Current state:

- `guidelines/product-backlog.md` is generic Agile text: Epic as strategic outcome over quarters, Feature "1-3 sprints", story "1-3 days", e-commerce examples, a LaTeX arrow on the last line, and an AC example whose blockquote nesting is broken.
- `.claude/skills/review-backlog/SKILL.md` sections 1-3 re-describe each level and add the project rules (13-point cap, mockable dependencies, single-story Feature is a question, Epic naming is not flagged).
- `read-backlog.mjs` prints the guidelines first and the CSV second, so the reviewer already has the guidelines in context.
- The tool accepts the points 1, 2, 3, 5, 8, 13, 21, 34, 55 (`POINTS` in `model.js`) and treats anything above 13 as "split" (`SPLIT_ABOVE`). `src/user-story-generator/sprint-points-guideline.md` holds effort benchmarks (including day estimates) for 1-13.
- `user-stories/*` and `reviews/*` are git-ignored, so committed documents must not copy rows from a real backlog.

## Goals / Non-Goals

**Goals:**
- One file defines the standards; the skill cites it.
- The guidelines read naturally to someone writing a story, not only to a reviewer.

**Non-Goals:**
- Changing the review script, the guard, the portal or the CSV format.
- Building the write-story skills (a later change that will also cite the guidelines).
- Rewriting `sprint-points-guideline.md`.

## Decisions

**1. Split by audience: standards vs procedure.** The guidelines hold anything a person writing a story would want to know (definitions, the size rule, INVEST meaning, AC rules, what a hard block is). The skill holds anything only a reviewer needs:
- classification: a single-story Feature or single-Feature Epic is a question, not an error; Epic naming style is not flagged;
- reporting: report hard blocks as problems and mention mockable links briefly ("can be decoupled by mocking X");
- confirm-thresholds: a measurable wording for a vague criterion needs the user's confirmation;
- no scope growth in rewordings;
- the edit-mapping table, JSON format, script usage and report layout.
Alternative considered: make the skill the source and delete the guidelines; rejected because the guidelines must also serve writing and the future write-story skills.

**2. The skill keeps a short checklist, not definitions.** Each of SKILL.md's three check sections becomes a list of what to look at, each item naming the guideline it comes from ("Small: see the size rule"). It does not paraphrase the rule, so a rule change needs no skill edit. The review-only judgments in decision 1 stay there.

**3. The size rule lives in the guidelines; benchmarks stay where they are.** The guidelines state: at most 13 points, scale 1-13, above 13 split, and link to `sprint-points-guideline.md` for effort benchmarks. They do not repeat the benchmarks, so there is still one copy. The tool's extra values 21/34/55 are described as "too big, split" markers, not valid story sizes, which matches `SPLIT_ABOVE`. The day estimates in the sizing guideline are effort benchmarks for points, not a size rule, so they are left alone.

**4. Examples are invented, drawn from the backlog's domains.** Examples use the same flavour as the real backlog (Identity & Access Management > User Auth & Sessions > Local Login, plus a failure-path AC) but are written fresh, so no row of a git-ignored backlog is committed.

**5. New `backlog-guidelines` capability for the file's contract.** The guidelines are a durable standard other capabilities depend on (the review skill now, the write-story skills later), so their key rules get a spec. The spec states the rules (13-point cap, Epic = domain area, Feature test, Independent meaning) and the single-source requirement, not wording.

**6. Stale-name fixes.** `SKILL.md` (description and AC section), `CLAUDE.md` (two lines, including the paragraph describing the reference material) and the spec's Purpose line change from `product-management.md` to `guidelines/product-backlog.md`. The Purpose line is not a requirement, so a delta cannot change it; it is edited directly in `openspec/specs/backlog-review-skill/spec.md` during apply. The delta covers the requirements that name the file.

## Risks / Trade-offs

- [A rule is dropped from both places while moving it] -> a task compares the old SKILL.md sections 1-3 against the new guidelines and skill, rule by rule, before deleting text.
- [Reviewer output quality changes because the skill is shorter] -> run the skill once on the sample backlog after the edit and compare the findings with the same checks as before (Hierarchy, INVEST, AC); investigate any rule no longer applied.
- [Existing backlogs contain Epics or Features that no longer fit the new wording] -> the reviewer reports only Feature problems, never Epic naming, so nothing new is flagged for Epic names; Feature findings show up as ordinary hierarchy findings the user can dismiss.
- [Guidelines now longer than the generic text, costing more context per review] -> the skill is shorter by about the same amount; keep the guidelines concise.
