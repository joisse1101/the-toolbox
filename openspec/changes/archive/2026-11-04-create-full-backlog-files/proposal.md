## Why

A backlog the portal creates today holds only `user-stories.csv`. The story skills report an error when the review, proposals or lexicon files are missing, so a fresh backlog is not usable until someone creates them by hand. The Settings tab's "create missing folders" is worse: it creates only the data folder and no backlog, so `/jois-story-explore` finds nothing to read (GitHub issues #83 and #84).

## What Changes

- The single New button (`#newBtn`, action `newBacklog`) creates a new backlog folder from scratch with every starting file present and header-only: `user-stories.csv`, `user-stories/review.csv`, `user-stories/proposals.csv`, `lexicon.csv` and `lexicon/lexicon-suggestions.csv`. It never reads or copies another backlog, and there is no second button or copy path.
- A taken name still gets the next free number (`new-backlog`, `new-backlog-2`, ...). The editor still opens the new backlog with one blank story held in memory, which autosave writes later.
- `slices/`, `context-map.json`, `context-map.md` and `review.csv.decided` are not created up front. The skills that own them create them when first used.
- The Settings tab's init action, for a data folder or a code base's `.plans`, also creates a first backlog by the same rule when the folder holds no backlog, so the story skills work straight afterwards.
- The set of starting files is defined once and shared by New and init.
- The server, not the browser, supplies the file contents. The create request no longer needs a `content` field.
- Not in scope: `planner.config.yaml` handling, because skills started in a project already find a `.plans/` folder there (issue 84's reported error is from before that was added), and `logs/`, which init no longer creates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-folder-layout`: "What a backlog folder holds" and "Create a backlog" now say a new backlog has all five starting files, header-only, and nothing taken from another backlog.
- `csv-file-store`: creating a backlog returns the numbered name and leaves an existing backlog untouched, with the full file set.
- `project-config`: init creates a first backlog when the folder holds none, for a data folder and for a code base's `.plans`.
- `user-story-editor`: New is the only way to create a backlog and builds it blank.

## Impact

- `planner/portal/server/server.cjs` (`createBacklog`) and `planner/logic/storage/project-folders.cjs` (`initFolders`, `initCodeBase`).
- A new shared starting-file definition built from the existing column lists in `planner/logic/backlog/model.js`, `review/review.js`, `lexicon/lexicon.js` and `lexicon/lexicon-suggestions.js`.
- `planner/portal/web/backlog-portal/hooks/useBacklog.js` stops sending file content on New.
- Tests for the create route and init, using temp folders and `planner/test/sample-data`, never `planner/data`.
- The skill scripts and the portal must read the header-only files without errors; this is verified, not assumed.
