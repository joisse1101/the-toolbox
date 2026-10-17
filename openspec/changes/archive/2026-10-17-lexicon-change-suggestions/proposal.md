## Why

The lexicon writer only adds and patches terms, so renaming or deleting one (for example "Role" to "Privilege") needs the user to do it by hand in the Lexicon tab, and until they do, the new Avoid word ("role") is refused because it still names a term. Letting the agent delete or rename on its own would break the rule that nothing is removed without the user's say. A suggestion the user applies keeps that rule, and review suggestions for stories already work this way.

## What Changes

- New store `lexicon-suggestions` (`data/lexicon-suggestions/<backlog>.csv`): one row per suggested `rename` or `delete` of a term, with a reason, the words to add to Avoid, and a status (`open`, `applied`, `dismissed`).
- New MCP tool `suggest_lexicon_change` in the `story-tools` server (propose session only). It validates the items, appends the rows, and returns the impact of each: terms whose `Part of` follows a rename, definitions and Avoid lists that contain the old name, and Avoid clashes. The skill shows that impact in its confirmation.
- The Lexicon tab shows open suggestions with Apply and Dismiss. Apply runs the existing `renameTerm` or `deleteTerm`. A rename suggestion adds the old name to the term's Avoid list by default (a checkbox the user can clear), checked and saved together with the rename, so "role" can be an Avoid word the moment "Role" stops being a term. A delete is refused while the term has children, with the same message as a manual delete. A suggestion is stale when its term is gone or the new name is taken.
- The lexicon suggestions file is part of the backlog's backup and of the backup comparison.
- `write-lexicon` and `write_lexicon` still never remove or rename a term.

## Capabilities

### New Capabilities
- `lexicon-suggestions`: the suggestions file, the agent tool that writes it, the impact report, and the Apply/Dismiss behaviour.

### Modified Capabilities
- `csv-file-store`: the `lexicon-suggestions` store is registered, copied by a backup and compared by the diff.
- `backlog-lexicon`: the Lexicon tab shows and applies suggestions.
- `lexicon-writer`: states that removal and renaming reach the lexicon only through a suggestion the user applies.

## Impact

- New: `core/lexicon-suggestions.js` (parse/serialize, `impactOf`, stale check, apply; pure), `app/frontend/user-story-generator/hooks/useLexiconSuggestions.js`, a suggestions list in `LexiconTab.jsx`, tests.
- Changed: `app/backend/server.cjs` (`STORES`), `core/backup.cjs` (store list), `core/flatten.js` callers, `ai/mcp/story-tools.mjs`, `propose-stories/SKILL.md`, `CLAUDE.md`.
- Depends on `shape-stories-mcp-server` being applied first (it adds the MCP server this change extends).
