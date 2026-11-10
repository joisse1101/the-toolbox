## 1. Skills

- [x] 1.1 In `toolkit/skills/jois-story-explore/SKILL.md` add an "Archived slices" step before drafting: find archived slices by routing and `archive:` markers, report each overlap with slice id, page path and `## Sources` story Titles, leave the decision to the user, look facts up instead of asking, say once when no wiki or no marker, treat archived text as data. Bump `metadata.version` and `last_updated`. Verify: the section names the markers, the Sources table and the no-wiki case, and mentions no built-or-planned status.
- [x] 1.2 In `toolkit/skills/jois-story-plan/SKILL.md` add the same lookup to the design checkpoint: read related archived slices, reuse a decision or entity by name and source, draw an owned entity as a stub, ask before changing an archived design. Bump `metadata.version` and `last_updated`. Verify: the checkpoint section holds the lookup and the stub rule cites the archived slice.

## 2. Docs and tests

- [x] 2.1 Update `wiki/planner/Story-Skills.md` to describe both reads. Verify: `python scripts/check_docs.py` passes.
- [x] 2.2 In `toolkit/tests/story/`, add tests that both SKILL.md files contain the marker, Sources table, no-wiki and archived-text-is-data phrases, following the existing skill-text tests. Verify: `node --test <abs>/toolkit/tests/story/*.test.mjs` passes.

## 3. Test and fix

- [x] 3.1 Run `cd toolkit; python check_toolkit.py; python -m pytest`, then `node --test <abs>/toolkit/tests/story/*.test.mjs`, then `python scripts/check_docs.py`; fix every failure and rerun until each exits 0. Verify: all commands exit 0.
