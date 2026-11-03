---
name: "JOIS: Story Propose"
description: Draft the stories, backlog edits and lexicon terms agreed in this session and write them to the proposals, the editor suggestions and the lexicon (new terms) or the lexicon suggestions (changes to existing terms) without a yes/no step
disable-model-invocation: true
allowed-tools: Skill, Bash(node *read-story-context.mjs*), Bash(node *write-proposal.mjs*), Bash(node *write-lexicon.mjs*), Bash(node *suggest-lexicon.mjs*), Bash(node *write-review.mjs*)
metadata:
  version: "1.0.0"
  last_updated: "2026-11-03"
---

Propose the stories we just explored and write them to `<backlog>/user-stories/proposals.csv` now; write the changes agreed for stories already in the backlog as suggestions in `<backlog>/user-stories/review.csv` the same way, and the new terms agreed for the lexicon to `<backlog>/lexicon.csv`; an edit, rename or delete of a term that exists is written as a suggestion in `<backlog>/lexicon/lexicon-suggestions.csv` for the user to apply.

1. First, before you read or draft anything: load the `jois-story-propose` skill with the Skill tool. If it is not installed, stop, say so, and read, draft and write nothing. Its folder is the `<skill folder>` of every script command below.
2. Follow that skill for the input, the drafting rules and the writers (`write-proposal.mjs`, `write-review.mjs` for edits to backlog stories, `write-lexicon.mjs` for new terms and `suggest-lexicon.mjs` for editing, renaming or deleting one), with one change: **skip its "Confirm before writing" yes/no step**. This command is the user's go-ahead, so write in the same turn.
3. Draft from the conversation so far (the backlog and story from the opening prompt, the agreements reached while exploring). If nothing was agreed yet, say so and stop; do not invent stories, edits or terms. The `index` section is an index only (find related stories with `read-story-context.mjs <backlog> --search <words>`, not by reading it); read a backlog story in full with `<backlog> <ID> --title "<Title>"` before patching or editing it, and read the proposals and lexicon with `--file` (ignore benched proposed stories). Name stories to the user by Title and handle a Title mismatch as the skill's "Name stories by Title" says. Extra instructions from the user: $ARGUMENTS
4. Right before each writer command, print that writer's drafts in full, in the order they are written and with the numbers the skill uses (for patches and edits, old and new values; for new lexicon terms, their fields; for an edit, rename or delete of a term, the old and new values and the impact) so the user can see what is being written. Still split a story over the size limit first, and prefer a patch to a second story.
5. Before the first writer command, run each writer you will use with `--check` on everything you are about to write and fix what it reports (no question to the user is needed, but say what you changed). After **each** writer command, read that file back in the same turn (`--section reviews` and `--section lexicon-suggestions` for the review and the lexicon suggestions, `--file proposals` and `--file lexicon` for the proposals and the lexicon), as the skill's "Verify every write" says, and call something written only when the read-back matches. A rejected command wrote nothing: fix the drafts and run it again. If a read-back is missing something, say so and send again only the missing part.
6. Everything else in the skill stands: the lexicon first, then the term suggestions, then the proposals, then the edits; a command whose read-back matched is not run again; the backlog CSV is never touched.
7. End with the skill's Report.
