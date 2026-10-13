## Context

See proposal.md for motivation. The tool is a vanilla-JS page (`public/user-story-generator/app.js`, `model.js`) with no build step. `renderStoryList()` rebuilds the list and `refreshDerived()` recomputes previews and warnings on every edit; `fillForm()` loads the selected story into the form. The only global key handler today closes the guideline popover on Escape. The sprint-points guideline already has an `i` button plus `.popover` that opens on hover/focus and pins on click.

## Goals / Non-Goals

**Goals:**
- Reuse existing render paths (`renderStoryList`, `refreshDerived`, `fillForm`) rather than adding a second rendering mechanism.
- Keep the completeness logic pure in `model.js` so it can be unit-tested like `shouldSplit`.

**Non-Goals:**
- No undo for delete; the existing `confirm()` stays.
- No custom autocomplete widget.
- No change to CSV format or server.
- No cross-backlog suggestions.

## Decisions

**Alt-based shortcuts, not Ctrl.** Browsers reserve Ctrl+N and Ctrl+Shift+N (calling `preventDefault` has no effect in a normal tab), and Ctrl+D is the bookmark shortcut. Alt+N / Alt+Shift+N / Alt+D can be intercepted. Alternative Ctrl+Alt+... rejected: it is AltGr on Windows and clumsy.

**One shortcut table.** A single array of `{ keys, label, run }` drives both the `keydown` handler and the popover contents, so the help cannot drift from behaviour. Matching uses `e.altKey`/`e.ctrlKey`/`e.shiftKey` plus `e.code` (`KeyN`, `KeyD`, `ArrowUp`, `ArrowDown`) so keyboard layouts and Option-key character substitution on Mac do not matter. The handler calls `preventDefault()` only for a matched, applicable shortcut. Ctrl+Up/Down moves selection without moving focus out of the active field; with no field focused, focus goes to Epic.

**Helper reuses the guideline popover.** The shared `setPinned`/outside-click/Escape logic is generalised to any `.info` element so there is one implementation. Trigger is a labelled "Shortcuts" button in the header next to the save chip, with `aria-expanded`. Labels show Option instead of Alt when `navigator.platform` indicates a Mac.

**Completeness is a pure function.** `storyIssues(story)` in `model.js` returns `{ errors: string[], warnings: string[] }`. Errors: blank Epic/Capability/Feature, any blank user story part (skipped when `rawUserStory` is non-empty), no criteria or any criterion with a blank part (skipped when `rawCriteria` is non-empty). Warnings: points blank, priority blank, points above `SPLIT_ABOVE` (reusing `shouldSplit`). The list row class is `incomplete` if there are errors, else `split`/`warning` if warnings. Red is checked first so it wins. The form gets a red banner above the existing yellow one; both are populated from `storyIssues`. The row `title` is the composed story (`storyCellText`) followed by error and warning lines; native `title` supports newlines so no custom tooltip is built.

**List label** is `capability: feature`, with one part alone when the other is blank, and "New story" when both are blank.

**Suggestions via `<datalist>`.** Three datalists are rebuilt in `refreshDerived()`/`fillForm()` from `state.backlog.stories`, deduplicated and trimmed, excluding blanks. Capability and Feature lists filter by the selected story's current Epic (and Capability), case-sensitive match on exact stored text. Alternative custom dropdown rejected as more code and accessibility work for little gain; datalist's substring matching and browser-dependent styling are accepted.

**Criteria minimum.** The remove button is disabled when `criteria.length === 1` (with a title explaining why), rather than hidden, so the control stays discoverable. For a loaded story with an empty cell, one blank criterion is seeded at display time in `renderCriteria` without calling `markDirty()`; the serialised cell stays empty because an all-blank criterion composes to no text — this must be verified against `composeCriteria` (task 5.3). A story with `rawCriteria` is not seeded.

**Enter in Then.** A `keydown` handler on each Then input: on Enter (not during IME composition, no modifiers) it pushes a new empty criterion, clears `rawCriteria`, re-renders, and focuses the new criterion's When field. The Given field of the new criterion is left empty and is not skipped over; the user asked for focus on When, so this follows that literally. Enter is only handled for the Then field, so Enter elsewhere is unchanged.

**Layout.** `tool.css` overrides `.page` on this page only (`max-width: none`, 16px side padding); `shared/style.css` and the tool index keep the 1100px column. The editor grid stays `260px 1fr`.

**Colour tokens.** `--bad-bg` and `--bad-border` are added to `shared/style.css` for both light and dark themes, based on the existing `--bad`.

## Risks / Trade-offs

- [Alt+D focuses the address bar in Chrome/Edge] → `preventDefault` on keydown stops it; verify manually in Chrome, Edge and Firefox.
- [Alt+N / Alt+D might collide with OS or screen-reader shortcuts] → shortcuts are discoverable and a single table makes remapping a one-line change.
- [datalist looks different per browser and matches substrings] → accepted for now; replace with a custom widget only if it proves annoying.
- [Seeding a blank criterion could make saved CSV differ from the file on disk] → no `markDirty` on seed, and the empty-criterion serialisation is verified by a unit test.
- [Red on many existing stories after upgrade] → intended; indicators are advisory and do not block saving.

## Open Questions

- Whether the new criterion created by Enter should copy the previous Given text. Not needed for the specs as written.
