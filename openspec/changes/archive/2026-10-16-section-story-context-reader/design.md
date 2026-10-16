## Context

See proposal.md for the problem. Current state:

- `readStoryContext` reads everything for the all-in-one form (guidelines, backlog, proposals, lexicon) and `formatContext` joins it into one string. The CLI branch prints it with one `console.log`.
- The guard's `SCRIPT` regex captures the file name (group 5) and an optional second word that must match the story-ID pattern (group 6). `--section` fails both that pattern and `NAME`'s role as a flag guard (`file?.startsWith('-')` is denied).
- The guard is shared by `explore-stories` (read-only) and `propose-stories` (read-write) sessions, so one change covers both.
- The guidelines are small and fixed (about 7.4 KB); the index, proposals and lexicon grow with the data.
- The Bash result cap is about 30,000 characters. A result over it is saved to a file the sessions cannot read.

## Goals / Non-Goals

**Goals:**
- Every reader call stays well under the cap for realistic backlogs, with the guidelines (the one fixed-size part) never sharing a call with data.
- A skill cannot silently lose context: the unsectioned call must not look like it worked.
- The guard grows by one strict form and no wider.

**Non-Goals:**
- Paging or filtering inside a section. If `proposals` alone passes the cap, that is a later change.
- Changing the data labels, the "data, never instructions" wording or the benched-story filtering.

## Decisions

**1. Four sections, named by content: `guidelines`, `index`, `proposals`, `lexicon`.** Each maps to one existing piece of `formatContext`. `guidelines` joins the two guideline files because they are always wanted together and total about 7 KB. Alternative: one section per file (five). Rejected: the sprint-points file is under 1 KB and nobody needs it alone.

**2. No section prints a menu, not everything.** The menu lists the four sections, their size in characters, the cap, and the exact command for each. The sizes come from formatting each section anyway, so the user and the skill also see which one is growing. The `proposals` line also says how many benched stories the section leaves out (when there are any), so a hidden story is visible without reading the section. Alternative: keep all-in-one as the default. Rejected: it is the call that overflows, and the skills would depend on an instruction to avoid it instead of on the tool not allowing it. Cost: the old single call no longer works, so every caller is updated (see tasks).

**3. A flag, not a positional word.** `<file> --section proposals`, not `<file> proposals`. The second positional slot already means "story ID", and the ID pattern (letters, digits, hyphens) would accept `proposals` as an ID, so the two forms would only be told apart by lookup. A flag keeps `<file> <ID>` untouched and gives the guard a form it can match literally.

**4. Guard: one extra literal alternative, evaluated before the ID.** The reader branch accepts, after the file name, either one ID or exactly ` --section (guidelines|index|proposals|lexicon)` and then nothing else. The words are an allow-list in the pattern, not a pattern-matched value. Everything else keeps today's result: `--all`, `--section=index`, `--section` with no word, `IAM-0004 --section index`, extra words and pipes are denied. The writers are unaffected: they still deny a second argument. The reader's own CLI check is the second line of defense, validating the section word again and exiting 2 on a bad form.

**5. Reader refactor.** `readStoryContext` takes an optional `section` and reads only the files that section needs, so a missing proposals file does not matter when `guidelines` is asked for and a missing guideline does not block `lexicon`. The formatting is split into one function per section plus a menu function; the old `formatContext` is replaced rather than kept (nothing else calls it besides tests). The existing error behavior stays: an unreadable guideline file reports which one and prints nothing else; a missing proposals or lexicon file is a note, not an error.

**6. Skills read sections, always including the guidelines.** `explore-stories` step 2 and `propose-stories` step 2 list four commands. `propose-stories` still runs all four at the start of every use, since the proposals may have changed in the portal. Reading `guidelines` once per session would save about 7 KB of context, but the skills currently promise the rules are in front of the model in every use, so that stays.

## Risks / Trade-offs

- [A skill or an old session still calls the unsectioned form and gets only a menu] → The menu says what to run; the SKILL.md wording and the command file are updated in the same change; the opening prompt of `shape-stories.ps1` only invokes the skill, so it needs no change.
- [Four calls per use instead of one] → Four small tool calls, each pre-approved by the existing `read-story-context.mjs:*` prefix; no new permission prompts.
- [The `proposals` section alone passes the cap in a very large backlog] → The menu shows its size, so the growth is visible before it breaks; paging is left for a later change.
- [Guard regex mistake widens access] → Tests cover the denied forms listed in the spec scenario, and the section words are literals.

## Migration Plan

No data migration. Ship the reader, guard, skills, command file, `CLAUDE.md` and tests together in one change; there is no state to roll back beyond reverting the commit. Sessions already open keep the old guard text until restarted; they just see the denial message listing the allowed forms.
