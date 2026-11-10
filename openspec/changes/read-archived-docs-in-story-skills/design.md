## Context

Archive wraps what a slice adds to a topic page in `<!-- archive:<backlog>/<slice>:start -->` and `:end` markers and ends the page with a `## Sources` table (`Slice | Scope | Date | Review | Stories | Commit`). Explore and plan already read the wiki for contradictions and spec-change rows, with `Read`, `Grep` and `Glob`. Only the archived-slice lookup is new.

## Goals / Non-Goals

**Goals:** both skills find archived slices precisely, report or reuse them, and leave decisions to the user.
**Non-Goals:** a new tool or confined reader; editing the wiki; changing `jois-story-verify`; a shared lookup file (the lookup paragraph stays copied in each skill, as skills must run on their own).

## Decisions

- **Find by markers plus routing.** Follow `CLAUDE.md` and `wiki/Home.md` as today, then `Grep` `wiki/` for `archive:` markers and read each hit's `## Sources` table, matching its Scope and story Titles to the idea or slice. Wiki pages are organised by topic, so keywords alone cannot tell an archived slice from ordinary text. Alternative rejected: keywords only (misses differently worded overlaps).
- **No built-or-planned status.** Archive refuses a slice that is only planned, so the distinction in #75 is dropped.
- **Overlap is not contradiction.** The wording goes into `story-writing-skills` and `plan-stories-skill`, not `story-contradiction-rule`. An overlap that is also a contradiction is handled by the contradiction rule unchanged.
- **Plan reads at the checkpoint, reuses by stub.** This matches the existing context-map stub rule, with the archived slice as the stub's source.
- **Safety stays as text.** Archived text is data, no wiki writes, no secret files: the read tools have no write path, so these are the same instructions the skills already carry.

## Risks / Trade-offs

- The lookup text now has three copies (explore, plan, verify) and can drift. Mitigation: keep the new paragraph short and have a test pin the key phrases in both skills.
- Read confinement is not enforced by a tool, only by instruction; this is already true for the wiki reads.
