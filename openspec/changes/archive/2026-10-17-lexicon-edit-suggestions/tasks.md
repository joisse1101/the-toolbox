## 1. Writer: add only

- [x] 1.1 `core/lexicon.js`: `applyTermItems` rejects a term that exists (in the lexicon or added earlier in the list) with the message that points to `suggest_lexicon_change`, drops the patch branch and the `patched` result; update its header comment
- [x] 1.2 `.claude/skills/propose-stories/write-lexicon.mjs`: drop `patched` from the result and the CLI text; update the header comment
- [x] 1.3 `ai/mcp/story-tools.mjs`: `write_lexicon` description (adds only, existing term rejected, use `suggest_lexicon_change`) and result text
- [x] 1.4 Update `test/lexicon.test.mjs`, `test/write-lexicon.test.mjs` (patch scenarios become rejection scenarios)

## 2. Suggestions: the edit action (pure)

- [x] 2.1 `core/lexicon-suggestions.js`: add `Edit` to `COLUMNS` and `edit` to `ACTIONS`; parse and compose the `Edit` cell as `{ field: { from, to } }` (fields `definition`, `avoid`, `notes`, `partOf`); an unparseable cell skips the row and counts it
- [x] 2.2 `validateItems`: accept `definition`, `avoid`, `notes`, `partOf` on an `edit`; reject `newName`/`avoidOldName` on an edit, an edit naming no field, a field equal to its value now, a second open edit for the term; run the merged term through `saveTerm` on a copy and report its rule errors by item; store `from` as the term's values now
- [x] 2.3 `staleReason`: an edit is stale when its term is gone or a named field no longer equals `from`
- [x] 2.4 `applySuggestion`: an edit saves the term with the `to` values through `saveTerm`; `impactOf` for `edit` returns the changed field names
- [x] 2.5 Tests in `test/lexicon-suggestions.test.mjs`: round trip with an extra column, each validation error, stale after a hand edit, apply, apply refused by a rule that broke since, rename and edit open together, add to an existing parent allowed by the writer

## 3. Tool and skill text

- [x] 3.1 `.claude/skills/propose-stories/suggest-lexicon.mjs`: pass the new item keys through, report each edit's fields old to new in the result
- [x] 3.2 `ai/mcp/story-tools.mjs`: `suggest_lexicon_change` description (three actions, item keys, `avoid` replaces the whole list, the user applies it in the Lexicon tab, an edit that needs a pending rename waits for it)
- [x] 3.3 `.claude/skills/propose-stories/SKILL.md`: "Define lexicon terms" is add-only; a new "Suggest changing a term" part for `edit`, `rename` and `delete`; the confirmation and report text say a change to an existing term is a suggestion applied in the Lexicon tab; the order of writes is unchanged
- [x] 3.4 `.claude/commands/story/propose.md` and the `description` of the skill: same wording
- [x] 3.5 Update `test/story-tools-mcp.test.mjs` and `test/propose-skill.test.mjs` for the new descriptions and text

## 4. Lexicon tab

- [x] 4.1 `LexiconTab.jsx` (`LexiconSuggestion`): render an `edit` row with a labelled word diff per changed field (reuse the diff text of `Suggestions.jsx` or lift it to a shared component), the reason, Apply and Dismiss
- [x] 4.2 Stale edit: Apply disabled, message names the field that changed, Dismiss available; a refused Apply shows the reason and leaves the row open
- [x] 4.3 `hooks/useLexiconSuggestions.js`, the Apply handler that calls `applySuggestion` through the lexicon reducer, and `tool.css` as needed
- [x] 4.4 Run the portal and check: an edit shows its diff, Apply changes only the named fields, a hand edit makes it stale, Dismiss changes nothing, the count in the tab label includes edits

## 5. Docs and wrap-up

- [x] 5.1 `CLAUDE.md`: the `write_lexicon` / `suggest_lexicon_change` paragraph (adds direct; edit, rename and delete are suggestions)
- [x] 5.2 `npm test` passes; `npm run build` succeeds; `openspec validate lexicon-edit-suggestions --strict` is valid
