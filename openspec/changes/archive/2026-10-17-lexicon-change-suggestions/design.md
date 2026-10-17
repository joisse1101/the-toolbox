## Context

`core/lexicon.js` already has `renameTerm`, `deleteTerm`, `saveTerm` (a rename rewrites children's `Part of`) and `newProblems`, which refuses only problems a change introduces. The Lexicon tab uses them. The agent's writer (`applyTermItems`) can add and patch only. Review suggestions for stories (`core/review.js`, `useReview.js`, `Suggestions.jsx`) are the model for a suggestion the user applies, but the review store is keyed by Story ID and a fixed field list, so it cannot hold term actions.

The blocking case: patching "Privilege" with `avoid: ["role"]` is refused while "Role" is still a term, so a rename that the user has not applied yet cannot be combined with a later Avoid patch.

## Goals / Non-Goals

**Goals**
- The agent can propose a rename or delete; only the user's Apply changes the lexicon.
- A rename and its Avoid additions are one atomic, validated change.
- The agent and the screen show the same impact.

**Non-Goals**
- No agent-side add/patch change (still written directly).
- No automatic rewrite of other terms' definitions or of stories on rename; they are listed as impact and handled as normal patches or review suggestions.
- No suggestions for other term fields.

## Decisions

**1. A separate store `lexicon-suggestions`, not review rows.**
Columns `Term, Action, New name, Add to Avoid, Reason, Status`. Alternative: encode `LEX:Role` as a Story ID in the review file; rejected, it breaks the review schema and the portal's review logic. One new line in `STORES` and `STORE_NAMES` (backup), and `flatten` needs no change because it is generic per CSV.

**2. Pure module `core/lexicon-suggestions.js`.**
`parseSuggestions` / `composeSuggestions` (unknown columns round-trip, like the lexicon), `validateItems(lexicon, existingRows, items)` for the tool, `impactOf(lexicon, term, action, newName)` shared by tool and tab, `staleReason(lexicon, row)`, and `applySuggestion(lexicon, row, { avoid })` returning `{ ok, lexicon }` or errors. Tests cover the pure module only, as for the rest of `core/`.

```
suggest_lexicon_change --validateItems/impactOf--> lexicon-suggestions/<b>.csv
                                                         |
Lexicon tab --staleReason/impactOf--> list  --Apply--> applySuggestion
                                                         |  renameTerm + avoid in one saveTerm
                                                         v  or deleteTerm
                                                  lexicons/<b>.csv  (autosave)
                                                  + Status=applied  (autosave)
```

**3. Apply is one saveTerm.** For a rename, build the term with its new name and `avoid` = old avoid + checked words, and call `saveTerm(lexicon, next, { replaces: old })`. Its `newProblems` check runs on the final lexicon, so "role" is accepted because "Role" no longer exists in the result. A delete calls `deleteTerm`; its children refusal is shown as is.

**4. Order of the two saves.** The tab dispatches the lexicon change and the status change together; the status is set to `applied` only after the lexicon reducer accepted the change (the reducer returns the refusal message, which the tab shows). Both autosave through the existing `useAutosave`; the suggestions hook mirrors `useReview`. Backup's `settle` also settles the suggestions hook.

**5. Impact rules.** Whole-word, case-insensitive match of the term name in other terms' Definition and Notes; Avoid lists containing the old or new name; children by `Part of`. Matching is advisory text only; nothing is rewritten.

**6. Old name in Avoid by default.** The row stores the words in `Add to Avoid` (old name included unless the item sets `avoidOldName: false`). The tab shows each as a checkbox, all checked; unchecking affects only that Apply (not stored). Alternative: store only a flag; rejected because extra words (for example "function") need a place too.

**7. Duplicate guard.** One open suggestion per term and action; a second one is rejected by the tool so the list stays readable.

**8. Tool lives in `ai/mcp/story-tools.mjs`** (from `shape-stories-mcp-server`), propose session only. The propose skill shows the suggestion and its impact in the confirmation and runs it after `write_lexicon` and before `write_proposals`, so a story can use the new name once the user applies it (the skill tells the user to apply before accepting stories that use it).

## Risks / Trade-offs

- **Depends on the MCP change** -> apply `shape-stories-mcp-server` first. If its spike fails, the tool is delivered as a script `suggest-lexicon.mjs` behind the existing Bash guard instead (same validation, same rows); the store, the pure module and the tab are unchanged.
- **Stories written with the new name before Apply** -> the skill states the dependency in its report; nothing breaks, the lexicon is only advisory for drafting.
- **A hand-edited suggestions file with a bad Action** -> row reads as unknown and is skipped and counted, like review rows.
- **Two sources of lexicon change (autosave and Apply)** -> both go through the same reducer, so there is one write path.

## Migration Plan

New store appears when first written; no migration. Rollback: remove the store line, the tool and the tab section; the data folder can be deleted.

## Open Questions

- None blocking.
