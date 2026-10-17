## 1. Core

- [x] 1.1 `core/lexicon-suggestions.js`: parse/compose (unknown columns kept, bad Status reads as open), `validateItems`, `impactOf`, `staleReason`, `applySuggestion` (rename with Avoid in one `saveTerm`, delete via `deleteTerm`)
- [x] 1.2 `test/lexicon-suggestions.test.mjs`: round trip, each rejection of `validateItems`, old name added to Avoid by default and with `avoidOldName: false`, impact (children, definitions, Avoid clashes), stale cases, apply rename with the Avoid word that was refused before, delete refused with children, old problems do not block

## 2. Store and backup

- [x] 2.1 Register `'lexicon-suggestions'` in `STORES` (`app/backend/server.cjs`) and in `STORE_NAMES` (`core/backup.cjs`); update `test/backup.test.mjs`
- [x] 2.2 Check backup copy, list and diff include the new folder (server routes, `BackupsTab` file labels)

## 3. Agent tool

- [x] 3.1 Add `suggest_lexicon_change` to `ai/mcp/story-tools.mjs` (not with `--read-only`): validate, append rows atomically, return the impact report
- [x] 3.2 Tool description: user applies in the Lexicon tab, delete refused while the term has children, old name avoided by default
- [x] 3.3 Tests in `test/story-tools-mcp.test.mjs`: appended rows keep existing ones, invalid item writes nothing, absent in read-only mode

## 4. Lexicon tab

- [x] 4.1 `hooks/useLexiconSuggestions.js` (like `useReview`: load, autosave status, `settle`)
- [x] 4.2 Suggestions section in `LexiconTab.jsx`: term, action, new name, reason, impact, Avoid checkboxes, Apply, Dismiss, stale reason with Apply disabled, badge count
- [x] 4.3 Apply dispatches the lexicon change and sets `applied` only when accepted; a refusal shows the reason
- [x] 4.4 Include the suggestions hook in the FileBar Backup `settle`

## 5. Skill and docs

- [x] 5.1 `propose-stories/SKILL.md`: use `suggest_lexicon_change` for rename and delete, show it with its impact in the one confirmation, order: `write_lexicon`, `suggest_lexicon_change`, `write_proposals`, `write_review`; replace "tell the user to use the Lexicon tab" for deletes
- [x] 5.2 `.claude/commands/story/propose.md`: same
- [x] 5.3 `CLAUDE.md` and `README.md`: new store, tool and tab section

## 6. Checks

- [x] 6.1 `npm test` and `npm run build` pass
- [x] 6.2 By hand on a scratch `TLT_DATA_DIR`: suggest "Role" -> "Privilege", see impact, apply with "role" in Avoid, back up and compare
- [x] 6.3 `openspec validate lexicon-change-suggestions`
