## Why

Archive (`/jois-code:archive`) now writes each finished slice into the project's wiki, so the wiki holds the record of what was built. `jois-story-explore` reads the wiki only to find contradictions, and `jois-story-plan` does not read archived pages at all. A new idea can therefore repeat a built design without being told, and a new slice can redraw an entity an earlier slice already defined. This is issue #75, item PR 9 of #98.

## What Changes

- `jois-story-explore` searches the archived slices in the wiki before it drafts a story, and reports each overlap: the slice, the page and the story Titles from that slice's `## Sources` row. It leaves the decision to the user.
- `jois-story-plan` reads the archived slices that touch the same scope at its design checkpoint. It reuses a settled decision or entity by name and source, draws another slice's entity as a stub, and asks the user before drawing anything that would change an archived design.
- Both skills find archived slices by the archive markers (`<!-- archive:<backlog>/<slice>:start -->`) and each page's `## Sources` table, as well as by the routing in `CLAUDE.md` and `wiki/Home.md`.
- A fact an archived page holds is looked up, not asked of the user.
- No built-or-planned status is reported: archive refuses a slice that is only planned, so every archived slice is built.
- With no wiki or no archived slice, each skill says so once and works as before.
- Skill versions and `last_updated` are bumped; the wiki page `wiki/planner/Story-Skills.md` is updated.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `story-writing-skills`: explore reports overlaps with archived slices.
- `plan-stories-skill`: plan reads related archived slices and reuses or stubs what they settled.

## Impact

- `toolkit/skills/jois-story-explore/SKILL.md` and `toolkit/skills/jois-story-plan/SKILL.md` (text only; no new script, tool or launcher entry).
- `wiki/planner/Story-Skills.md`.
- `toolkit/skills/jois-story-verify` is untouched; its wiki lookup is not shared.
- Archived text stays data and the skills never write to the wiki or open secret files, so the reading adds no write path.
