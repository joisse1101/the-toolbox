## Why

`write_lexicon` patches an existing term in place (definition, Avoid, Notes, Part of), so the agent can overwrite a definition the user wrote with only the session's yes/no and a backup diff as a safety net. Stories already work the other way: new ones are staged, and edits to existing ones are suggestions the user applies. The lexicon should follow the same rule: the agent may add a term directly, but any change to a term that exists is a suggestion the user reviews as a diff and applies.

## What Changes

- `write_lexicon` / `write-lexicon.mjs` only **add** terms. An item whose term already exists is rejected with a message that points to `suggest_lexicon_change`. Nothing else about adding changes (definition required, parent in the same run, term rules).
- `suggest_lexicon_change` gets a third action, **`edit`**: `{ term, action: "edit", definition?, avoid?, notes?, partOf?, reason }` with at least one field that differs from the term as it is now. `avoid` replaces the whole list, as a patch did. Rows are appended as open suggestions; the lexicon is not changed.
- The suggestions file stores, for an `edit` row, the fields to change with their old and new values (a new `Edit` column, JSON). Apply compares the old values with the term as it is when the user applies.
- The Lexicon tab shows an `edit` suggestion as a word-level diff per changed field (old value struck through, new value highlighted, the same `wordDiff` the story suggestions use), with the reason, and Apply / Dismiss for the suggestion as a whole.
- An `edit` is **stale** (Apply disabled, Dismiss available) when its term is gone or renamed, or when any named field no longer equals its old value (the term changed since the suggestion was written). Apply runs the same checks as saving the term by hand and shows a refusal.
- One open `edit` per term; an open `edit` and an open `rename` or `delete` of the same term may coexist.
- `propose-stories` and `/story:propose` show an edit with old and new values and say it is a suggestion the user applies in the Lexicon tab, not written straight in. The write order stays: `write_lexicon` (adds), `suggest_lexicon_change`, `write_proposals`, `write_review`.
- **BREAKING** (agent-facing): a patch sent to `write_lexicon` is now an error. No stored data changes, so nothing is migrated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lexicon-writer`: add-only; no patching; existing term rejected.
- `lexicon-suggestions`: the `edit` action, its columns, validation, stale check, diff view and Apply.
- `backlog-lexicon`: the tab shows and applies edit suggestions.
- `story-writing-skills`: the propose skill suggests term edits instead of patching, and shows them old and new.
- `story-tools-mcp`: `write_lexicon` and `suggest_lexicon_change` descriptions state the new rules.

## Impact

- `core/lexicon.js` (`applyTermItems` adds only), `core/lexicon-suggestions.js` (`edit` action, `Edit` column, `validateItems`, `impactOf`, `staleReason`, `applySuggestion`), reuse of `core/word-diff.js`.
- `.claude/skills/propose-stories/write-lexicon.mjs`, `suggest-lexicon.mjs`, `SKILL.md`; `.claude/commands/story/propose.md`; `ai/mcp/story-tools.mjs` (descriptions and result text).
- `app/frontend/user-story-generator/components/LexiconTab.jsx`, `hooks/useLexiconSuggestions.js`, `tool.css`.
- `CLAUDE.md`, tests under `test/` (`lexicon`, `write-lexicon`, `lexicon-suggestions`, `propose-skill`, `story-tools-mcp`).
- No change to the term CSV format, the backup, or the file API (`lexicon-suggestions` is already a store; unknown columns already round-trip, and the new column is added when missing).
