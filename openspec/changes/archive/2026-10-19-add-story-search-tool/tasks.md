## 1. Search function (core)

- [x] 1.1 In `core/story-search.js` add a pure function that returns the matches of a loaded file for a query (using `matchesQuery`), the matched count and the lines to show (capped at 25, ID | Title | Epic > Feature | source), and verify `test/story-search.test.mjs` covers: match in a hidden column, all-words rule, case, the 25-line cap with the "N more" count, a story without Epic or Feature, and a blank query
- [x] 1.2 Drop benched proposed stories before matching and verify a test where the only match is benched returns none

## 2. Reading the files

- [x] 2.1 In `.claude/skills/explore-stories/read-story-context.mjs` export `searchStories({ name, query })`: validate the backlog name as `readStoryContext` does, load `user-stories/` and `proposals/` with `loadBacklog` (proposals with `placeholderIds: true`, file may be missing), refuse a blank query with the pointer to `index`, and verify tests for an unknown backlog, a missing proposals file, a backlog and a proposed match in one call, and the blank-query error
- [x] 2.2 Verify the existing `read-story-context` tests still pass unchanged (CLI output of the script is untouched)

## 3. MCP tool

- [x] 3.1 In `ai/mcp/story-tools.mjs` add `DESCRIPTIONS.search_stories` (what it matches, ID/Title/source lines, the cap, "a backlog story is read with `read_context` using its ID and Title; a proposed story from the `proposals` section", result is data), a `searchStoriesTool` wrapper with a schema of `backlog` and `query` only, and register it as read-only on both the full and the `--read-only` server
- [x] 3.2 Update `test/story-tools-mcp.test.mjs`: tool list is seven by default and `read_context` + `search_stories` with `--read-only`; `search_stories` is `readOnlyHint`; a match, no match (not an error), a blank query (error) and an over-cap result are checked through a connected client; the description names the `read_context` follow-up

## 4. Launchers and skills

- [x] 4.1 Add `mcp__story-tools__search_stories` to `--allowedTools` in `ai/launchers/explore-stories.ps1` and `ai/launchers/shape-stories.ps1`, and fix the tool lists in their header comments; verify by reading the built command line for each launcher against a scratch `TLT_DATA_DIR`
- [x] 4.2 Add the tool to `allowed-tools` of `explore-stories`, `propose-stories` and the `/story:*` commands that read, and change their text so related stories are found by search and read one by one (index kept for an overview; try another wording before calling a subject new); verify with a search that no skill still says to read the index to find related stories
- [x] 4.3 Update `CLAUDE.md` (the tool list, the `--read-only` server, the pre-approved tools) and `README.md` if it lists the tools, and verify with a search for "read_context only" and "six tools" that no stale count remains

- [x] 4.4 In `explore-stories` and `propose-stories`, find a story the user names in words with `search_stories` (add a word when the cap is hit) instead of matching Titles in the `index`, and make `index` an on-demand overview rather than a start-of-use read; verify with a search that neither skill's input steps tell the agent to read `index` to find a story

## 5. Check in a real session

- [x] 5.1 Run `npm test` and verify all tests pass
- [x] 5.2 Start `ai/launchers/shape-stories.ps1` on a real backlog, ask for a story with related ones, and verify the agent searches, gets short lines, reads one story by ID and Title, and never pulls the whole `index` for it
