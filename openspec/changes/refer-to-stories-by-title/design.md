## Context

See proposal.md for why. Today the story tools key a story by ID alone: `readStoryContext` finds the row whose ID cell equals `storyId`; `core/review.js` (`checkFindings`) looks the row's `storyId` up in `byCode`; `core/proposal-input.js` resolves a patch `id` against the proposals file and each `dependsOn` entry against the backlog or `proposed:` list. `ai/mcp/story-tools.mjs` is a thin layer over those exported functions, and the CLI scripts are thin wrappers over the same functions; the specs require both to give the same results as before.

Backlog IDs are derived (`renumber`), `NEW-<n>` are assigned once and stay, and Titles are free text with no uniqueness rule (only Epic + Feature + Title is used to spot a repeated proposal).

## Goals / Non-Goals

**Goals:**
- A stale ID can never silently redirect a read or a write to another story.
- The agent can recover from a stale ID alone, using the reply, without a user round trip in the common case.
- Everything the user reads names stories by Title.

**Non-Goals:**
- Resolving a story by Title alone, or by fuzzy matching. The Title is a witness for the ID, not a key.
- Changing stored data: CSV columns, the review file, the portal and the `Depends On` cell stay ID-based.
- Giving backlog IDs a stable form.

## Decisions

**1. One pure helper does the check (`core/story-ref.js`).** `resolveStoryRef(stories, {id, title}, {required})` returns `{ok: true, story}` or `{ok: false, message}`. The message holds what the ID holds now and the stories with the given Title (ID, Epic, Feature), built from one list of `{id, title, epic, feature}`. Match rule: trim + case-fold, the same as the repeated-story key, so a Title the portal's user retyped with different case still matches. `proposal-input.js`, `review.js` and `readStoryContext` call it; the MCP layer does not duplicate it.
*Alternative:* check in `story-tools.mjs` only. Rejected: `check_drafts` and the writers would need the stories loaded a second time, and the scripts could not share the error text.

**2. Required in the tools, optional in the scripts.** The exported functions take a `requireTitles` option; `story-tools.mjs` passes `true`, the CLI wrappers do not. Without the option a Title that is given is still checked, and a bare ID behaves as today. This keeps the "scripts produce the results they did before" requirement and the existing script tests.
*Alternative:* require it everywhere. Rejected: it breaks every script-based test and any hand-run use for no gain, since the agent only reaches the data through the tools.

**3. The witness key is `storyTitle`, not `title`.** A patch already uses `title` for the new Title, so a second meaning would be a trap. `storyTitle` is used the same way for `read_context` and review rows; `dependsOn` entries and `storyIds` are `{id, title}` objects because there the pair is the whole value; a `Depends On` review row has `targetTitle`.
*Alternative:* encode as one string (`"IAM-0004|Reset password"`). Rejected: easy to get wrong, and a Title may contain any character.

**4. Mismatch is an error, never a repair.** The tool does not pick the single candidate even when there is exactly one. The cost is one extra call; the gain is that a wrong guess (a Title reused by a different story) cannot write. All mismatches of a call are reported together, like the writers' other problems, and nothing is written. `check_drafts` reports them too, so the skill finds out before it asks the user.

**5. Candidates come from the same file as the ID.** A backlog ID is looked up in `user-stories/`, a `NEW-<n>` in `proposals/` (benched stories are listed as candidates but marked benched, since a patch to one is refused anyway). No cross-file search: a story moved to Proposed has a new `NEW-<n>` and the Title is how the agent finds it, so the "nowhere" reply points at the `proposals` section as well as the `index`.

**6. `NEW-<k>` inside one `write_proposals` call stays a bare string.** It is a position in the same call, not a reference to stored data, so it cannot go stale.

**7. The skills change their prose, not their steps.** Each place that prints or asks for an ID becomes the Title; the ID is looked up from the `index`/`proposals` section the skill already reads at the start. The relocation loop (read the candidate, repeat the call) is written once in `propose-stories/SKILL.md` and cited by `review-backlog`, `explore-stories` and `/story:propose`, as the per-write read-back rules already are.

**8. The launcher adds the Title to the opening prompt but keeps its arguments.** It already validates `NEW-<n>` / backlog IDs by reading the files, so it reads the Title there too. Free text stays free text: whether it names an existing story is the skill's judgement from the `index`, not the launcher's, because a text that equals a Title is as likely to be a new need as an existing story.

## Risks / Trade-offs

- [Longer tool calls: a Title next to every ID] → The agent already has the Title in the `index` it read; the cost is a few tokens per row.
- [A Title edited in the portal between the read and the write is reported as a mismatch] → Correct behaviour: the reply says what the ID holds now, the agent re-reads and repeats.
- [Two stories with one Title and a stale ID] → The reply lists both with Epic and Feature; the agent asks the user when it cannot tell. Never auto-picked (decision 4).
- [Breaking change for any caller sending bare IDs] → Only the agent sessions call the tools, and the descriptions state the rule; the refusal text says what to add.
- [Review rows keep only the ID, so a later renumber can still stale them] → Unchanged and already handled by the portal's stale detection; this change protects the moment of writing.

## Migration Plan

No data migration. Ship tool, scripts, launcher and skill text together so a session never has skills that send Titles to tools that do not take them. Rollback is a revert of the change; nothing stored depends on it.
