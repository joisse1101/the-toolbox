---
description: Draft the stories agreed in this session and write them to the proposals file without a yes/no step
allowed-tools: Bash(node .claude/skills/explore-stories/read-story-context.mjs:*), Bash(node .claude/skills/propose-stories/write-proposal.mjs:*)
---

Propose the stories we just explored and write them to `proposals/<backlog file name>` now.

1. Load the `propose-stories` skill with the Skill tool and follow it for the input, the drafting rules and the writer (`write-proposal.mjs`), with one change: **skip its "Confirm before writing" yes/no step**. This command is the user's go-ahead, so write in the same turn.
2. Draft from the conversation so far (the backlog and story from the opening prompt, the agreements reached while exploring). If nothing was agreed yet, say so and stop; do not invent stories. Extra instructions from the user: $ARGUMENTS
3. Before running the writer, print the drafts (and, for patches, old and new values) so the user can see what is being written. Still split a story over the size limit first, and prefer a patch to a second story.
4. A rejected run wrote nothing: fix the drafts and run again. Everything else in the skill stands: batches of 3-4, run each batch once, the writer only, the backlog CSV is never touched.
5. End with the skill's Report.
