# Proposal

## Why

Three code reviews and three browser reviews of the planner portal found the same weak spots: styling without scales, parts that a keyboard cannot reach, meaning carried by colour alone, deletes that are unsafe or inconsistent, and four components too large to change safely. The portal is the team lead's daily tool, so these slow real work and can delete stories the user cannot see.

## What Changes

Four stages, each a separate commit-sized step:

1. **Visual system.** Add scales for type, spacing, radius, shadow, greys and the accent colour. Fix disabled, focus, hover, selected and sorted states. Fix the phone-width tab bar, the cut-off table IDs and headers, the page width on large screens, and the Graph tab's fit-on-resize and smallest text size.
2. **Keyboard and non-colour cues.** Story and Lexicon rows become real buttons. The tab bar moves with arrow keys. The Add project dialog manages focus. Graph nodes and edges show a focus ring. Status (incomplete, warning, selected) is also written as text or an icon, and the graph gets a legend. A backlog with no proposals or lexicon file loads without failed requests.
3. **Safe actions and one pattern per tab.**
   - One shared confirmation dialog replaces every browser `confirm()` and the unconfirmed deletes. Red appears only on its final button.
   - Bulk delete acts only on rows the user can see.
   - Each view has one primary action.
   - Every tab gets the same header and empty-state shape.
   - Settings is grouped, and its paths can be selected and copied.
   - The bulk bar stays quiet until rows are ticked.
4. **Structure.** Split `GraphTab`, `StoryForm`, `StoriesTab` and `App` into smaller components and hooks, and replace repeated flex rules with small layout helpers. No behaviour change.

## Capabilities

### New Capabilities
- `portal-visual-system`: the portal's scales, interaction states, responsive layout and graph sizing.
- `portal-accessibility`: keyboard access, focus visibility and non-colour cues in the portal.
- `portal-safe-actions`: confirmation of destructive actions, hidden-row protection, one primary action per view and the shared tab pattern.

### Modified Capabilities

- `backlog-review-suggestions`: the "Review tab" requirement ends with "There SHALL be no 'apply all' action", which contradicts the later requirement "Accept all applies every open suggestion of an area" and the tab as built. The sentence is replaced by a pointer to that requirement. Nothing else about the tab changes.

## Impact

- Code: `planner/portal/web/` (all of `backlog-portal/`, `shared/style.css`) and one small change in `planner/portal/server/server.cjs` for missing optional files.
- Docs: `wiki/planner/architecture/Portal.md` (new shared pieces), `wiki/planner/User-Flows.md` where flows change.
- Tests: pure modules only (the project has no DOM tests), plus a browser check with `playwright-cli` on mock data for each stage.
- No new dependencies, no data-format change, nothing in `planner/logic/` changes.
