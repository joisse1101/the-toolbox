## Why

`review-backlog/SKILL.md` and `guidelines/product-backlog.md` both state the rules for each level, and they have drifted: the guidelines size a story as "1-3 days, one sprint" while the skill enforces a 13-point cap; the guidelines call an Epic a strategic outcome spanning quarters while the project uses domain areas; and the skill, spec and `CLAUDE.md` still point at `product-management.md`, which no longer exists. The guidelines are also loaded in full by `read-backlog.mjs`, so the reviewer reads both copies. The planned write-story skills need one standard to cite, so the standard must live in one place first.

## What Changes

- `guidelines/product-backlog.md` becomes the single source of truth for what a valid Epic, Feature, Story and acceptance criterion is, for both writing and reviewing:
  - Story size is at most 13 sprint points (scale 1, 2, 3, 5, 8, 13); the "1-3 days" and "single sprint" wording is removed.
  - An Epic is a domain area named by a short noun phrase (for example "Identity & Access Management"), not a strategic outcome; it spans several Features.
  - A Feature is a capability a user would recognise by name, named by a short noun phrase, demoable end to end once its stories are done, and sliced into several stories. No time-based sizing.
  - Independent means decoupled for planning: a real-world order is not a violation; a hard block is, a mockable link is not.
  - The file is tidied (no LaTeX, correct AC nesting, examples taken from this project's backlog instead of e-commerce).
- `review-backlog/SKILL.md` stops restating those rules. Its sections 1-3 keep only reviewer behaviour (question vs error, hard block vs mockable reporting, thresholds the user must confirm, no scope growth) and point to the guidelines for the standard.
- Stale `product-management.md` references are fixed in `SKILL.md`, `CLAUDE.md` and the `backlog-review-skill` spec.

## Capabilities

### New Capabilities

- `backlog-guidelines`: the content contract of `guidelines/product-backlog.md` (definitions of each level, the size rule, INVEST meaning, acceptance-criteria rules) and its role as the single source of standards for writing and reviewing stories.

### Modified Capabilities

- `backlog-review-skill`: the skill reviews against `guidelines/product-backlog.md` and does not restate its rules; the Hierarchy requirement follows the new Epic and Feature definitions; the Acceptance criteria requirement names the right file.

## Impact

- `guidelines/product-backlog.md`, `.claude/skills/review-backlog/SKILL.md`, `CLAUDE.md`, `openspec/specs/backlog-review-skill/spec.md` (Purpose line, edited directly because deltas cannot change it).
- `src/user-story-generator/sprint-points-guideline.md` stays the detailed sizing reference; the guidelines link to it rather than copy it.
- No script, server, `package.json` or portal change. Independent of the `harden-review-scripts` change.
