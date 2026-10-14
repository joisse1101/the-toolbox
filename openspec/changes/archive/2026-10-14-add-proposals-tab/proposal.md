## Why

The team lead wants to draft new stories (with Claude, in a later change) without putting half-baked rows into the real backlog, which the app autosaves and renumbers. There is nowhere to hold stories that are proposed but not yet accepted, and no way to move them into the backlog once they are. This change adds that holding area and the accept step to the portal; the skills that fill it come in a follow-up change (`add-write-story-skills`), which depends on the file format defined here.

## What Changes

- A new data folder `proposals/` is registered as a store, with one file per backlog (`proposals/<backlog file name>`), git-ignored like `user-stories/` and `reviews/`.
- A proposals file has the same columns as a backlog. Its stories carry placeholder IDs `NEW-<n>` and are not renumbered by epic and position.
- A **Proposed** tab is always shown for the open backlog (`Proposed (0)` without a file); the file is created when the first story is added. It works like the Editor tab (story list and form: edit, add, delete, reorder, autosave) on the proposals file.
- **Accept story** and **Accept all** move stories from proposals into the backlog:
  - each accepted story goes to the **end of its Epic**, whatever its Feature (an Epic with 7 stories gets an 8th); an Epic that does not exist yet starts at the end of the backlog;
  - the backlog is renumbered through the existing path, so derived IDs and `Depends On` links stay correct;
  - a story may be accepted alone even if it has `Depends On` links: links to backlog stories stay, links between stories accepted together become their new IDs, and a link to a story still proposed stays as its `NEW-<n>` until that story is accepted, when it is rewritten;
  - accepted stories are removed from proposals, and proposed stories that depended on them are re-pointed to the new IDs.
- The "Depends On lists X, which does not exist" warning says "still proposed" for a `NEW-<n>` entry.
- Out of scope: the explore and propose skills, any CLI script that writes proposals, and Stories/Graph tabs for proposals.

## Capabilities

### New Capabilities

- `story-proposals`: the proposals store and file format, the Proposed tab, placeholder IDs, and accepting stories into the backlog (placement, renumbering, dependency handling).

### Modified Capabilities

None. The existing `csv-file-store` rules already cover any registered folder, and the `user-story-editor` requirements are unchanged for backlogs.

## Impact

- `server.cjs` (`STORES`), `.gitignore`, `README.md` and `CLAUDE.md` (store list).
- `src/user-story-generator/`: `model.js` (load without renumbering), a new pure `proposals.js`, `ids.js` (`backlogProblems` message), a new `hooks/useProposals.js`, a new `components/ProposedTab.jsx`, and `App.jsx` (tab, accept wiring). `StoryList` and `StoryForm` are reused.
- New tests for the pure module and for the changed loader and message.
- No change to review files or the review skill.
