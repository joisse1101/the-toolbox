## Context

See proposal.md for motivation. Today `propose-stories` writes only `proposals/` through `write-proposal.mjs`; editor suggestions are `reviews/<backlog>.csv` rows written only by `write-review.mjs`, which the portal already shows, applies and marks stale (`core/review.js`). The shape session's guard (`explore-stories/guard-bash.mjs --read-write`) allows the reader and the proposal writer only, and `/story:propose` is a thin command that loads the `propose-stories` skill and skips its yes/no. `core/review.js` `AREAS` also drives the portal's Review tab sections.

## Goals / Non-Goals

**Goals:**
- Let the propose flow turn an agreed change to a backlog story into a review row the editor shows, with one confirmation covering stories, patches and edits.
- Reuse the existing review writer and portal unchanged.

**Non-Goals:**
- No new skill, command, writer script, or portal change; no rename of `/story:propose`.
- No editing of `user-stories/` by any skill (still only the portal does that).
- No new review `Area` value, no `add-story`/split groups from this skill, no Priority.

## Decisions

1. **Edits are review rows via `write-review.mjs --append`.** The writer already validates against the backlog, fills `Current`, handles locked stories and keeps decided statuses; the portal already renders Apply/Dismiss. Alternative: a new writer or a new "edits" file. Rejected: duplicates validation and needs portal work.
2. **Always `--append`.** A run without it replaces the whole review, which would wipe the audit's pending suggestions. The guard, not just the instructions, refuses the non-append form in a propose session. Known inverse hazard (unchanged): a later `review-backlog` run without `--append` replaces edits written here; the writer keeps *decided* statuses, pending rows are lost. Accepted; the review skill is a full re-audit.
3. **Extend `propose-stories` instead of a second skill.** One confirmation over everything needs one skill to draft and show it; a second skill would need to share the yes/no. `/story:propose` keeps working because it defers to the skill.
4. **New stories always go to `proposals/`.** The skill never emits `add-story` rows. A split of a backlog story is a `replace` row narrowing it plus new stories in the proposals (a `Depends On` or Notes line can tie them). Keeps one place where new stories live and reuses the Proposed tab's accept flow.
5. **Two writes, no cross-file atomicity.** Order: proposals first, then review. Each command is atomic and validates alone; nothing validates both. On a rejected second command the skill reports what was written and resends only the failed part; the first command is never repeated (new stories are not idempotent). Alternative: a combined dry-run mode in the writers. Rejected as new writer surface for a rare failure.
6. **Area values map to the existing four** (Hierarchy, INVEST, Acceptance criteria, Clarification) by the kind of edit, because `AREAS` drives the Review tab's sections and a new value would need portal work. A discussion-born edit that fits none uses the closest and says why in `reason`.
7. **Locked stories:** the skill sees `Locked: Yes` in the CSV the reader prints. It writes an `unlock` row (empty field/suggested, reason = why the change is needed) with the edit rows, and the draft says the edit is not applicable until the user unlocks the story. The writer already rejects field edits on a locked story without an `unlock` row, so a forgotten row fails loudly.
8. **Guard:** add the `write-review` form to `explore-stories/guard-bash.mjs` when `--read-write` (`<file> --append <<'JSON'` only). `--read-only` still allows the reader only. The shape session now allows a union, so the skill split (propose never writes `user-stories/`, never replaces reviews) is held by the guard's forms plus the skill text, not by separate sessions.
9. **Launcher:** `shape-stories.ps1` treats a `^[A-Za-z]+-\d+$` story that is not `NEW-<n>` as a backlog ID and validates it against `user-stories/<backlog>`, mirroring the `NEW-<n>` check. The explore skill already opens on the story's text from the reader output.
10. **Existing tests pin SKILL.md text.** `propose-skill.test.mjs` parses the first `<<'JSON'` example in `propose-stories/SKILL.md` through the proposal validator; the new review example must come after it, and the guard tests cover the new form.

## Risks / Trade-offs

- [Second write rejected after the first succeeded] → Skill reports what was written and resends only the failed part; documented in the skill and spec.
- [A later `review-backlog` run replaces pending edits written here] → Accepted; mention it in the skill's report so the user applies edits before re-auditing.
- [Edit is a suggestion, not applied] → Report tells the user to Apply it in the editor; the skill never edits `user-stories/` (the app autosaves it and would clash).
- [Union guard in the shape session] → Forms are still exact-match; the replace form is denied.
- [Free text such as `AB-12` is read as a story ID by the launcher] → The launcher reports it is not in the backlog; the user can rephrase. Low impact.
