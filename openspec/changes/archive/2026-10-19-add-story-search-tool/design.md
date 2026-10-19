## Context

The Stories tab search is `matchesQuery(story, query, headers)` in `core/story-search.js`: pure, every word, any field (known columns from the live story fields, unknown columns from `cells`). `read-story-context.mjs` already reads the backlog and the proposals and holds the file-name and folder checks; the MCP tool functions in `ai/mcp/story-tools.mjs` are thin wrappers over exported functions. A backlog story is read in full by `read_context` with `storyId` + `storyTitle`; the Title check (`resolveStoryRef`) is why a search result must show the current Title. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One match rule for the portal and the sessions, so "I can find it in the Stories tab" and "the agent can find it" mean the same thing.
- A result that is small whatever the backlog size, and a call that is hard to get wrong.

**Non-Goals:**
- Ranking, fuzzy or synonym matching, regex, field filters, snippets of the matching text.
- Searching the lexicon, the reviews or the lexicon suggestions.
- A CLI script form (like `suggest_lexicon_change`, the tool has none).

## Decisions

**1. Reuse `matchesQuery` unchanged; add the cap and the line format next to it.** `core/story-search.js` gains one pure function that takes the loaded stories of a file, the query and the headers and returns the matches. The cap and the format are part of the tool's contract, so they live with the matching and are tested without a server. Alternative: filter in the tool wrapper; rejected because the format would then be untested without spawning the server.

**2. Load both files with `loadBacklog`, proposals with `placeholderIds: true`.** That is how the portal reads them, so the stories searched are the stories the user sees. The file reading goes in `read-story-context.mjs` (an exported `searchStories`), which already validates the backlog name and finds `user-stories/` and `proposals/`. Benched proposed stories are dropped by their `benched` flag. Alternative: search the CSV text with a regex; rejected because composed fields (User Story, criteria, clarifications) are not in the cells as the user reads them.

**3. Return ID, Title, Epic > Feature and the source, nothing else.** The Title is needed for the next `read_context` call; Epic > Feature tells apart two stories with one Title (the same form `resolveStoryRef` uses for candidates). Anything more (User Story text, points) is what made the `index` heavy. A line is `IAM-0004 | Export report as CSV | Reporting > Export | backlog`; a proposed story reads `NEW-3 | ... | proposed`.

**4. Cap at 25 lines, say what was cut.** The tail line is `N more matched; narrow the query.` A fixed cap keeps the result small without a `limit` argument to get wrong. Alternative: a `limit` parameter; rejected (YAGNI, and one more thing for a model to misuse).

**5. Blank query is an error, no match is not.** On the tab a blank query shows every story; in a session that is the bloat this tool avoids, so it is refused with a pointer to `index`. A query that matches nothing returns plain text and `isError` false, because a failing-looking call is what made the agent retry.

**6. Tiny schema.** `backlog` (string) and `query` (string, min length 1) only. The query is not parsed beyond splitting on spaces, so there is no syntax to get wrong.

**7. Permissions follow `read_context`.** Annotated `readOnlyHint`, registered on the `--read-only` server, listed in the launchers' `--allowedTools`. The explore launcher pre-approves it next to `read_context`; the shape launcher next to `read_context` and `check_drafts`.

**8. Skills use it for "related stories".** `SKILL.md` and the `/story:*` commands add the tool to `allowed-tools` and replace "read the index" as the way to find related stories with "search, then read the stories you need". The `index` section stays for an overview. Because a search that finds nothing is weak evidence, the skills must try another wording before calling a subject new.

## Risks / Trade-offs

[Word search misses a synonym ("download" vs "export")] → the skills try a second wording before calling a subject new; the lexicon's Avoid list already pushes stories toward one wording.

[A common word matches most of the backlog] → the cap and the "narrow the query" line; the agent adds a word.

[Proposed and backlog IDs look alike in one list] → every line ends with its source, and a `NEW-<n>` is read from the `proposals` section, which the description says.

[A result goes stale when the backlog is renumbered] → unchanged from today: `read_context` checks ID and Title and reports a mismatch.
