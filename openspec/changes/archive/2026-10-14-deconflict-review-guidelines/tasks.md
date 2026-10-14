## 1. Rule inventory

- [x] 1.1 List every rule in SKILL.md sections 1-3 and in the current guidelines in a scratch table (rule, in guidelines?, in skill?, conflict?) and verify each is assigned to "guidelines" or "skill" per the design before any text is removed

## 2. Rewrite the guidelines

- [x] 2.1 Rewrite the Epic, Feature, User Story and Acceptance Criteria sections of `guidelines/product-backlog.md`: Epic as a domain area spanning several Features; Feature as a recognisable capability that can be demoed end to end, with several stories; no time-based sizing; verify the file contains no "quarters", "sprints" for Feature size, or "1-3 days"
- [x] 2.2 Add the size rule (max 13 points, scale 1, 2, 3, 5, 8, 13, split above 13, 21/34/55 are "too big" markers) with a link to `src/user-story-generator/sprint-points-guideline.md`; verify the link path exists
- [x] 2.3 Define each INVEST principle for this project, including Independent as decoupled for planning, hard block vs mockable, and real-world order not being a violation; verify with the Login/Logout example
- [x] 2.4 Replace the e-commerce examples with invented Identity & Access Management examples (an Epic, a Feature, a story with its "so that", and Given-When-Then criteria including a failure path); verify none is copied from `user-stories/*.csv`
- [x] 2.5 Tidy the file: remove the LaTeX hierarchy line (use a plain-text arrow chain), fix the AC list nesting so it renders; verify by viewing the file's Markdown preview

## 3. Slim the skill

- [x] 3.1 Rewrite SKILL.md sections 1-3 as short checklists that cite the guidelines and keep only review behaviour (questions vs errors, hard block vs mockable reporting, user-confirmed thresholds, Epic naming not flagged); verify no definition or numeric rule (such as "13") is stated in SKILL.md except where it quotes a Sprint points validation value
- [x] 3.2 Replace `product-management.md` with `guidelines/product-backlog.md` in the SKILL.md description and the acceptance-criteria section; verify `grep -n "product-management" .claude/skills/review-backlog/SKILL.md` finds nothing
- [x] 3.3 Do the rule-by-rule comparison from 1.1 against the new files and verify every rule exists in exactly one place

## 4. Fix stale references

- [x] 4.1 Update the two `product-management.md` mentions in `CLAUDE.md` (the review-backlog paragraph and the reference-material paragraph, which should now describe `guidelines/product-backlog.md` as the single source of backlog standards); verify with grep
- [x] 4.2 Edit the Purpose line of `openspec/specs/backlog-review-skill/spec.md` to name `guidelines/product-backlog.md`; verify `grep -rn "product-management" openspec/specs CLAUDE.md .claude` finds nothing (archived changes may keep the old name)

## 5. Verify

- [x] 5.1 Run the review-backlog skill on a sample backlog and verify it still reports the three areas, still treats a single-story Feature as a question, does not flag Epic naming, and writes a review file the portal accepts
- [x] 5.2 Run `node --test test/*.test.mjs` and `openspec validate deconflict-review-guidelines` and verify both pass
