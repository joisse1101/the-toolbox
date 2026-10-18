## 1. Resolve an ID and Title (core)

- [x] 1.1 Add `core/story-ref.js` with `resolveStoryRef` (trim + case-fold match; message with what the ID holds now and the stories with the Title, each with ID, Epic, Feature; the "nowhere" and "ID not in the file" wording) and verify `test/story-ref.test.mjs` covers match, case/spacing, ID holds another story, shared Title, Title nowhere, missing ID, and benched marking
- [x] 1.2 Add a `requireTitles` option semantics (bare ID refused with the "add the Title" text; a given Title always checked) to the helper and verify its tests for both modes pass

## 2. Readers and writers

- [x] 2.1 `read-story-context.mjs`: take `storyTitle` for a story and `{id, title}` pairs for `storyIds`, call the helper, and verify `npm test` read-story-context cases for match, mismatch reply and CLI call without a Title (unchanged output)
- [x] 2.2 `core/proposal-input.js`: check patch `storyTitle` and `{id, title}` `dependsOn` entries for backlog and `proposed:` stories, keep `NEW-<k>` bare, report all mismatches together, and verify `proposal-input` and `write-proposal` tests incl. the rename-through-patch and CLI-bare-ID scenarios
- [x] 2.3 `core/review.js` / `write-review.mjs`: check row `storyTitle` and `Depends On` `targetTitle` without storing them, and verify `review` and `write-review` tests incl. "stored row unchanged" and the CLI call without Titles
- [x] 2.4 Make `checkProposal` and `checkReview` return the same mismatch problems, and verify `check_drafts` reports them without changing any file

## 3. MCP server

- [x] 3.1 `ai/mcp/story-tools.mjs`: add the Title fields to the schemas, pass `requireTitles: true`, and update `DESCRIPTIONS` (the rule, the `{id, title}` shape, "on a mismatch read the candidate and repeat"); verify `test/story-tools-mcp.test.mjs` covers refusal of a bare ID, a matching pair, a mismatch reply and the descriptions naming the rule
- [x] 3.2 Verify the read-only server and the permissions are unchanged (existing mcp tests still pass)

## 4. Launcher

- [x] 4.1 `ai/launchers/shape-stories.ps1`: read the Title of a resolved `NEW-<n>` / backlog ID and put it in the opening prompt; free text unchanged. Verify by running the script against a scratch `TLT_DATA_DIR` and reading the prompt it builds for `NEW-57`, `IAM-0004`, free text and an unknown ID

## 5. Skills and command text

- [ ] 5.1 `propose-stories/SKILL.md`: name stories by Title in drafts, patches, edits, dependencies and the report; add the relocation rule once; show examples with `storyTitle` and `{id, title}`; verify `test/propose-skill.test.mjs` (update its expectations) passes
- [ ] 5.2 `explore-stories/SKILL.md` and `read-story-context.mjs` usage text: Titles in prose, match a loosely named story against the `index`, ask when several fit
- [ ] 5.3 `review-backlog/SKILL.md`: report and unlock list by Title, row examples with `storyTitle`; keep `guard-bash.mjs` rules (verify its test passes)
- [ ] 5.4 `.claude/commands/story/propose.md`: call `read_context` with `storyId` and `storyTitle`; cite the relocation rule

## 6. Docs and close-out

- [ ] 6.1 Update `CLAUDE.md` (the tool descriptions, the Title witness, the launcher note) and verify it matches the specs
- [ ] 6.2 Run `npm test` and `openspec validate refer-to-stories-by-title --strict`, and verify both pass
