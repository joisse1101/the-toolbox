## 1. Pure logic

- [x] 1.1 Add `acceptAll(stories, units, headers)` to `core/review.js`: skip `unlock` rows, units with a `confirm` row, locked units and units that fail or are stale on the evolving stories; return `{ stories, applied, skipped }` with a reason per skipped unit
- [x] 1.2 Add tests in `test/` for: all eligible, each skip reason, a later unit made stale by an earlier one, a split group counted as one unit (always a confirm default, so skipped as a check), a refused apply, the summary text, order preserved, no eligible unit leaves the stories unchanged

## 2. State

- [x] 2.1 Add the `acceptSuggestions` reducer case and an `acceptAll(units)` method to `useBacklog.js` that returns the applied units and the skipped ones with reasons
- [x] 2.2 In `App.jsx`, add the handler: dry-run count, `window.confirm` with that count, run, one `review.decide` for all applied indexes, summary notice (applied / left open by reason)

## 3. Review tab UI

- [x] 3.1 Add Accept all to the `ReviewTab` header and to each Area section heading, disabled when the scope has no units; pass the scope's units to `onAcceptAll`
- [x] 3.2 Show the summary with a neutral style distinct from the error notice

## 4. Verify

- [x] 4.1 Run `npm test` and `npm run build`
- [ ] 4.2 Try it in the portal: whole review, one section, a locked story, a `confirm` row, an `unlock` row, and a review file locked in Excel
