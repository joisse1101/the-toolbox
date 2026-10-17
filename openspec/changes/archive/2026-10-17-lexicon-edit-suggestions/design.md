## Context

`write_lexicon` (`applyTermItems` in `core/lexicon.js`) adds a term or patches one that exists, straight into `lexicons/<backlog>`. Renames and deletes already go through `suggest_lexicon_change` into `lexicon-suggestions/<backlog>` (`core/lexicon-suggestions.js`), where the Lexicon tab lists them with Apply and Dismiss. Story edits are the model for what the user wants: a `replace` review row stores `Current` and the suggested value, and the story form shows a word diff of the two (`core/word-diff.js`, `Suggestions.jsx`).

The gap: a patch to an existing term is invisible until it has landed. This change moves patches into the suggestions store as a third action, `edit`, and makes the writer add-only.

## Goals / Non-Goals

**Goals:**
- Any change to an existing term is a suggestion the user sees as a diff and applies or dismisses as a whole.
- Adding a new term stays direct, so stories written in the same run can use it.
- Reuse the suggestions store, hook, tab list and `wordDiff`; no new store or backup entry.

**Non-Goals:**
- No per-field accept in one suggestion, and no merging of an edit with later hand edits (a drifted term makes the edit stale; the agent suggests again).
- No change to the term CSV, the backup, or the file API.
- No automatic rewrite of other terms or stories that use a changed term (the impact lists them, as for a rename).

## Decisions

**1. A third action in the same store.** `Action` becomes `rename | delete | edit`. The alternative, a separate store, would add a second list in the tab, a second hook, a second backup file and a second duplicate rule for no gain.

**2. The `Edit` column holds `{ field: { from, to } }` as JSON.** Fields are `definition`, `avoid`, `notes`, `partOf`; `avoid` values are word lists, the others text, and only the named fields appear. A flat set of old/new columns per field would add eight columns that are empty for every rename and delete, and "field not named" would need a separate marker because `partOf: ""` and `avoid: []` are real values (they clear). The file is written by the tool and changed by the tab only in `Status`, so JSON in one cell is acceptable; a cell that does not parse makes the row unreadable and it is skipped and counted, like a row with an unknown Action. Other columns of an `edit` row (`New name`, `Add to Avoid`) stay empty.

**3. `from` is a snapshot taken when the tool is called, and Apply compares it with the term now.** Each named field must still equal `from` (names compared as for terms, lists in order). If not, the row is stale (Apply disabled, Dismiss available) and shows both what it would change and why it is out of date. This is what makes "replace the whole Avoid list" safe: an Avoid word the user added after the suggestion is never silently dropped. Rejected: merging by add/remove (a second vocabulary for the agent) and replacing without a check.

**4. Validation at suggest time uses the real save path.** `validateItems` builds the merged term and runs it through `saveTerm` on a copy of the lexicon, so every term rule (unknown parent, cycle, Avoid word that is a term, definition not blank) is reported at once, by item, and nothing is written. It also rejects an edit that changes nothing, a second open `edit` for the term, and `newName` / `avoidOldName` on an edit. Apply runs the same `saveTerm` again on the lexicon as it is then, so a rule broken in between shows as a refusal and the row stays open.

**5. An edit that depends on a pending rename or delete is refused at suggest time.** `avoid` ["role"] on "Privilege" fails while "Role" is still a term. This is the original blocker of `lexicon-change-suggestions`; for a rename it is solved by `Add to Avoid`. For an edit the agent suggests the rename first, the user applies it, and the edit is suggested in a later run. The skill says so.

**6. The writer rejects an existing term instead of converting it.** `applyTermItems` drops the patch branch and `patched` from its result; an existing name gives `item <n>: "<term>" is already a term: suggest a change with suggest_lexicon_change (action "edit")`. A silent conversion would hide from the agent which write happened and the skill's confirmation would have to guess.

**7. The tab shows an edit with `wordDiff` per field.** Each changed field is a labelled row (Definition, Avoid, Notes, Part of) with the diff of `from` to `to`; `avoid` is joined with "; " for the diff. The diff text component of `Suggestions.jsx` is reused or lifted to a small shared component rather than copied. Stale and refusal text use the existing `suggestion-why` / `stale` styles.

**8. Impact of an edit.** `impactOf` for `edit` returns the changed field names and, when `partOf` changes, nothing else; the tool result and the tab list the fields. Definitions that mention the term are not relevant to an edit of the term itself.

## Risks / Trade-offs

- An edit goes stale when the user touches the term for any reason, and the agent must suggest again -> accepted; the stale row says which field changed and can be dismissed. The cost is a second round trip, the benefit is that nothing is overwritten.
- More steps for a small Avoid tweak -> intended; it is the point of the change.
- A hand-edited `Edit` cell that is not valid JSON -> row skipped and counted, like an unknown Action, and the rest of the file is kept on save.
- Existing prompts and tests describe patching -> updated with the change (skill, command, tool descriptions, `CLAUDE.md`, tests).
