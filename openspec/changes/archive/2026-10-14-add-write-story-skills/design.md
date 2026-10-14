## Context

See proposal.md for why. What exists (observed):

- The review skill is the pattern: `.claude/skills/review-backlog/` holds `SKILL.md`, `read-backlog.mjs` (fixed paths, name validated by `validateName` from `server.cjs`), `write-review.mjs` (validate everything, write nothing unless valid, atomic write), `guard-bash.mjs` (a PreToolUse hook that denies every Bash command except the allowed forms) and `locked-settings.json` (wires the hook). Its tests spawn the scripts against a temp root.
- `src/user-story-generator/proposals.js` already has `nextPlaceholder(proposed, backlog)`, `isPlaceholder`, and `acceptProposed`; `model.js` has `loadBacklog(text, { placeholderIds: true })`, `serializeBacklog`, `newStory(headers)`; `ids.js` has `backlogProblems` (cycle detection); `story-text.js` has `parseStory`/`parseCriteria`/`composeCriteria`.
- `story-proposals` (main spec) already says a new placeholder is above every `NEW-<n>` in the proposals file and in the backlog's Depends On, and that a writer outside the portal must follow it. The portal refreshes the Proposed tab from disk on tab focus; unsaved local edits win.
- `proposals/*` is git-ignored and holds the user's real data.

## Goals / Non-Goals

**Goals:**
- Claude can discuss stories read-only, and write confirmed stories to the proposals file only, with every story validated against the guidelines' format before it lands.
- The file the writer produces is indistinguishable from one made in the portal.

**Non-Goals:**
- Editing, replacing or deleting existing proposals from the skills (done in the portal).
- Accepting stories into the backlog (portal).
- Enforcing the confirmation step in code: it is a skill instruction, as with the review skill. The guard enforces *which commands* can run, not *when*.
- Portal changes.

## Decisions

**1. Two skills, one shared reader.** `explore-stories` and `propose-stories` are separate because their write rights differ: the explore session is locked to the reader, the propose session also gets the writer. Both read through `.claude/skills/explore-stories/read-story-context.mjs`, which prints `guidelines/product-backlog.md`, then `user-stories/<name>`, then `proposals/<name>` when it exists (a missing proposals file prints a note, not an error), each labelled as data. `propose-stories` references the explore skill's reader by path rather than carrying a copy. With no argument it lists the backlog names. Alternative: one skill with a mode; rejected because "never writes" is then only a convention within one session.

**2. One guard, two modes.** `.claude/skills/explore-stories/guard-bash.mjs` exports `check(command, { allowWrite })` and as a hook takes `--read-only` or `--read-write` from its command line. `explore-stories/locked-settings.json` wires `--read-only`, `propose-stories/locked-settings.json` wires `--read-write`. It copies the review guard's approach: first line must match a fixed pattern, the file argument is a plain name, and the heredoc must end with a lone `JSON` line with nothing after. Alternative: two guard files; rejected as duplicated parsing code.

**3. The writer only adds.** Unlike `write-review.mjs` (first run replaces, `--append` adds), `write-proposal.mjs` has a single form and always adds. The proposals file is edited by the user in the portal, so a replace could destroy their work, and "batches" become simply repeated runs that each validate alone. The cost: running the same batch twice duplicates it; the skill is told to run each batch once and the success line lists the IDs added.

**4. Input format (JSON array on stdin).** One object per story, exactly these keys:
`epic, feature, title, userStory, points, dependsOn[], criteria[], notes` (`notes` optional; `dependsOn` and `criteria` arrays of strings; `points` a number or numeral string). `userStory` is the full cell text and is checked with `parseStory`; each criterion string is `AC<n>: Given …, when …, then …`, checked with `parseCriteria` after joining with newlines. Unknown keys (including `priority`, `id`, `code`) are errors so a typo cannot be silently dropped. Single-line fields reject line breaks.

**5. Dependency references.** In `dependsOn`: a backlog ID (must exist in the backlog), `NEW-<k>` meaning *the k-th story of this input* (1-based; resolved to the allocated ID), or `proposed:NEW-<n>` meaning a story already in the proposals file (must exist; written as `NEW-<n>`). The prefix removes the ambiguity between "story 1 of this batch" and "`NEW-1` already in the file". Self links, repeats and cycles (checked over backlog + existing proposals + new stories with `backlogProblems`) are errors.

**6. Pure core, thin script.** `src/user-story-generator/proposal-input.js` exports `buildProposals({ input, backlog, proposals })` where `backlog` and `proposals` come from `loadBacklog` (`proposals` null when the file is missing). It returns `{ ok: true, stories, ids }` (stories built with `newStory`, with `code` set, `cells` padded to the headers, `codedEpic` = `epic`) or `{ ok: false, errors }` with every problem found. `write-proposal.mjs` only does I/O: validate the name, read the files, call `buildProposals`, append the stories to the loaded proposals (`serializeBacklog` keeps existing rows, order and unknown columns), write atomically (temp file in the same folder, then rename; a `.tmp` is not listed by the file API) and print the IDs. Allocation: start from `nextPlaceholder(existingProposals, backlogStories)` and take one more number per story in input order.

**7. New file headers.** A missing proposals file is created with the backlog's headers (so unknown columns line up when stories are accepted) and a BOM, the same as the portal does.

**8. Skill text.** `SKILL.md` for both cite `guidelines/product-backlog.md` and describe only the working method: what to read first, how to keep drafts small and vertical, reuse Epic and Feature names from the backlog, offer a split above 13 points, never set Priority. `propose-stories` also documents the stdin format, the three `dependsOn` forms, and the confirmation step: show full drafts, ask yes/no, wait for a separate "yes" message, run the writer once per batch (about 8-10 stories), then report the assigned IDs.

## Risks / Trade-offs

- [The portal has the Proposed tab open with unsaved edits when the writer adds rows, and its autosave then writes the old list] -> the portal reloads from disk on tab focus when it has nothing pending, and the writer is run from the terminal, so focus returns to the browser after it; the skill's closing line tells the user to look at the Proposed tab. Not solved in code; a portal-side merge is out of scope.
- [Confirmation is only a skill instruction] -> the guard limits what can run, the writer is add-only and the result lands in `proposals/`, which the user reviews before accepting; nothing reaches the backlog without a portal click.
- [A duplicate batch from a re-run] -> add-only writes make it visible and deletable in the portal; the success message lists the IDs.
- [Numbers are only unique against what files show now] -> same rule as the portal (design of `add-proposals-tab`, decision 4); a number is never reused while the backlog's Depends On still names it.
- [Reader output includes user data that could contain instructions] -> labelled as data in the output and in both `SKILL.md` files, like the review skill.
