---
description: Draft the stories, backlog edits and lexicon terms agreed in this session and write them to the proposals, the editor suggestions and the lexicon without a yes/no step
allowed-tools: mcp__story-tools__read_context
---

Propose the stories we just explored and write them to `proposals/<backlog file name>` now; write the changes agreed for stories already in the backlog as suggestions in `reviews/<backlog file name>` the same way, and the terms agreed for the lexicon to `lexicons/<backlog file name>`; a rename or delete of a term is written as a suggestion in `lexicon-suggestions/<backlog file name>` for the user to apply.

1. Load the `propose-stories` skill with the Skill tool and follow it for the input, the drafting rules and the writers (`write_proposals`, `write_review` for edits to backlog stories, `write_lexicon` for terms and `suggest_lexicon_change` for renaming or deleting one), with one change: **skip its "Confirm before writing" yes/no step**. This command is the user's go-ahead, so write in the same turn.
2. Draft from the conversation so far (the backlog and story from the opening prompt, the agreements reached while exploring). If nothing was agreed yet, say so and stop; do not invent stories, edits or terms. The `index` section is an index only; call `read_context` with the `storyId` to read a backlog story in full before patching or editing it. Extra instructions from the user: $ARGUMENTS
3. Right before each writer call, print that writer's drafts in full, in the order they are written and with the numbers the skill uses (for patches and edits, old and new values; for lexicon terms, whether each is added or patched and its fields; for a rename or delete, the impact) so the user can see what is being written. Still split a story over the size limit first, and prefer a patch to a second story.
4. A rejected call wrote nothing: fix the drafts and call again. Everything else in the skill stands: run each call once, the lexicon first, then the term suggestions, then the proposals, then the edits, never run a succeeded call again, the backlog CSV is never touched.
5. End with the skill's Report.
