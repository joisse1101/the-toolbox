## 1. Writer and Apply (core)

- [x] 1.1 In `validateFindings` (`core/review.js`), apply the "not itself", "is a story in the backlog" and "`NEW-<n>` in the same Group" checks to a `Depends On` `add` only; for `remove` keep "the story lists the entry" and check `targetTitle` only when a story other than the row's own holds the code. Verify with `test/review.test.mjs`: `remove` of a code no story holds, of the story's own code and of a `NEW-<n>` (no Group) is accepted; `remove` of an entry the story does not list is rejected; `add` of a missing story, itself and a `NEW-<n>` outside its Group is still rejected; with `requireTitles`, `remove` of a code a story holds without `targetTitle` is rejected and of a code no story holds is accepted.
- [x] 1.2 In `applySuggestions`, make a `Depends On` `remove` filter the story's `dependsOn` and `ambiguous` by the entry text, without looking up a target story or raising "a dependency needs both stories to have an ID". Verify with `test/review.test.mjs`: Apply of a dangling, self and `NEW-<n>` `remove` removes only that entry and keeps the other links; a `remove` of a real link still works after the renumber; an `add` to a missing story still returns the error.
- [x] 1.3 Verify `suggestionState` and `retargetRows` need no change: a test shows a `remove` row is open while the story lists the entry and stale once it does not (including a `NEW-<n>` rewritten by accepting its proposal), and that an unrelated renumber leaves a dangling-code row as written. `npm test` passes.

## 2. Skill and tool text

- [x] 2.1 Update `.claude/skills/review-backlog/SKILL.md`: one rule for every `dependency` kind (does not exist, itself, still proposed, cycle) that is a `remove` row on `Depends On`, Area `INVEST`; drop the Clarifications workaround; the Reason says what the link was probably meant to be, or for a `NEW-<n>` that it returns by hand on acceptance. Verify by reading the file against every scenario of the `backlog-review-skill` delta and with `grep` showing no remaining text that says a dependency link "cannot be removed". Keep the file's CRLF line endings.
- [x] 2.2 Check the `write_review` description in `ai/mcp/story-tools.mjs` ("Depends On: add or remove, suggested is one story ID"): change it so a `remove` may name an entry no story holds and needs `targetTitle` only when a story holds the code. Verify with `test/story-tools-mcp.test.mjs`.

## 3. Docs and specs

- [x] 3.1 Update the review-backlog paragraph of `CLAUDE.md`: replace the sentence that a missing, self or still-proposed `Depends On` link cannot be removed through a review row with the new rule (a `remove` row deletes the listed entry; only a story-holding code needs `targetTitle`). Verify with `grep` that the old sentence is gone.
- [x] 3.2 Run `openspec validate remove-missing-dependency-links --strict` and `npm test`; verify both pass.
