## Context

See proposal.md - Why. The story sessions run from this repo with a locked tool set, `--strict-mcp-config` and `locked-settings.json` (which excludes CLAUDE.md and user rules). Story IDs are derived: `renumber` (`planner/logic/backlog/ids.js`) recomputes them and the portal's hooks rewrite their own files when it does. A diagram folder is outside the portal, so nothing would follow a recode. The backlog tools already treat an `{id, title}` pair as the story's name and refuse a mismatch (`resolveStoryRef`, `planner/logic/backlog/story-ref.js`). The mock slice is `planner/test/sample-data/diagrams/sample/sign-in/`; the user renders `.puml` in the VS Code PlantUML plugin.

## Goals / Non-Goals

**Goals**
- Turn the stories of an Epic, a Feature or one story into a use-case spec plus class and sequence diagrams that stay linked to those stories.
- Optionally ground the diagrams in an existing repo without giving the session any way to write to it or to read its secrets.

**Non-Goals**
- Rendering, exporting images or a portal tab for diagrams (the plugin renders; a portal view can follow).
- Writing or changing stories, proposals, reviews or the lexicon from this session.
- Reverse-engineering diagrams from code alone, or checking code against stories beyond listing differences in the conversation.
- A PlantUML syntax parser. Checks are structural; the plugin is the render test.

## Decisions

### D1. A second MCP server, not more tools on `backlog-tools`
`diagram-tools.mjs` holds the diagram and repo tools. The plan-stories session registers it beside `backlog-tools --read-only`.
- *Why*: repo reading is a privilege the story sessions must not gain, and `backlog-tools-mcp` says its writers write only through the story functions. A separate server keeps both specs true and needs no modified capability.
- *Alternative*: add the tools to `backlog-tools` behind a flag. Rejected: one server would then mix three trust levels (read backlog, write backlog files, read an arbitrary repo) and a flag mistake would expose all three.
- The server imports `planner/logic/` and the skill scripts, as `planner/claude/` may (zones test).

### D2. Story links live in `source.json`, healed by Title on read
The diagram files hold no story ID. `source.json` holds `{scope, stories:[{id, title, hash}], drawnAt}`. `read_diagrams` matches each entry to the backlog by Title (trimmed, case-folded, using Epic and Feature to break ties), repairs a changed `id` and regenerates the specification's generated header; it never edits a diagram file.
- *Why*: the portal's recode hooks need the stories in memory; a folder on disk has none, and a hook would leave the slice stale whenever the portal is closed. Titles are what the backlog tools already trust, so the same rule works with no portal change.
- *Alternative*: a portal hook that applies the recode map like `useReview`. Kept as a later addition; it would only save the repair step.
- *Consequence*: renaming a story's Title makes it "missing" until the slice is redrawn. That is intended: a renamed story is a changed story.
- The hash is of the story's User Story, acceptance criteria and Title, not of Notes or Priority, so edits that do not change meaning do not stale the slice.

### D3. Scope rule: Epic first, Feature when it stops being one picture
The skill recommends an Epic slice when the stories share a root entity (found from the lexicon's terms and the stories' nouns) and the class diagram would hold at most 12 classes (a value in the conventions document); a Feature slice otherwise; a story slice only for a flow its Feature's slice lacks. The numbers are starting values, tuned in the conventions document, not in code.
- *Alternative*: always Feature. Rejected: it splits a domain model that is one thing and repeats its classes.
- Entities shared by two slices: the owning Epic draws the class fully and other slices show a stub (stereotype and name only).

### D4. One skill with a confirm step
`plan-stories` reads, drafts in chat, asks one yes/no, writes, reads back. The explore/propose split exists because stories pass through a review queue; a diagram is itself the draft, so a second skill would only repeat the draft.
- The write is not pre-approved, so Claude Code asks too, as in shape-stories.

### D5. Repo access is data in a git-ignored file, enforced in the tool
`planner/data/diagrams/<backlog>/repo.json` holds `path` and `exclude`. The target repo's own `.claude/settings.json` cannot be used: it is never loaded in this session, and deny rules for built-in tools do not apply to an MCP tool that reads the disk itself.
- Enforcement is in the tool: realpath confinement, then a fixed baseline of secret patterns, then the user's globs. `exclude` is additive only; there is no way to remove a baseline entry. Matching a link's *real* path stops a link to an excluded file.
- Pure matching and confinement logic (`planner/logic/diagrams/repo-rules.js`) takes paths and returns allow/deny so it is tested without a file system; the fs reading is in the skill folder.
- No tool writes `repo.json`; only the user or the launcher's `-Repo` does, so the session cannot loosen its limits.
- *Not done*: importing the repo's `.gitignore` or `settings.json` deny rules (a parser and a surprise source of hidden code); redacting secrets inside ordinary files. The user copies patterns into `exclude`.

### D6. Two ready files, one hook
The wait-for hook currently waits for one `PLANNER_MCP_READY_FILE`. The launcher sets `PLANNER_MCP_READY_FILES` (a path list) as well; the hook waits for every listed file, and still honours the single variable so the story launchers do not change behavior.

### D7. Where the logic lives
`planner/logic/diagrams/` (pure): `source.js` (build and compare `source.json`, hash, heal by Title), `checks.js` (structural checks of the files), `repo-rules.js` (exclusion and confinement decisions), `limits.js` reading the numeric limits from the conventions document's front matter so the number lives once. `.claude/skills/plan-stories/` holds the thin scripts (`read-diagrams.mjs`, `write-diagram.mjs`, `repo-reader.mjs`) that the tools call, as the story skills' scripts do.
- Checks need the conventions' limits and palette: the conventions file carries them in a small fenced block that `limits.js` reads, so the document and the checks cannot disagree.

### D8. Checks are structural
`check_diagram` verifies: one `@startuml`/`@enduml` pair per file with a unique name, no `!include`, declared participants, `phase.step` ids, palette colors per stereotype, class count, no story-ID-shaped text, every criterion has a spec row and failure criteria have an `alt`. It does not parse full PlantUML; a syntax error is caught by the plugin's render.
- *Alternative*: run `plantuml -syntax` through Java. Rejected for now: the user's plugin may be in server mode with no local Java, and a missing Java would make checks environment-dependent.

## Risks / Trade-offs

- **Public render server** [the plugin may send diagram text to a public PlantUML server by default, and the text comes from private stories] → The conventions document and the launcher's first-run note tell the user to set the plugin to a local or self-hosted renderer; nothing here changes the plugin's settings.
- **Secrets in ordinary source files** [exclusion works on files, not lines] → The baseline and `exclude` cover the usual files; the repo-reader spec says so, and a line filter can follow.
- **Healing by Title is wrong when two stories share a Title** → Epic and Feature break the tie; an unresolved tie is reported, never guessed.
- **Class-count limit and scope rule are guesses** → They live in the conventions file and can change without code.
- **A repo with prompt-injection text** → Output is labelled data, the session has no write tools for the repo, and the only write is `write_diagram` behind a confirmation and a permission prompt.
- **Two servers slow the first prompt** → The hook waits for both; the existing timeout message names the server that did not connect.

## Migration Plan

Additive. New folders (`planner/data/diagrams/`, `.claude/skills/plan-stories/`, `planner/logic/diagrams/`) and new files; the story launchers, skills, stores and portal are unchanged apart from the hook accepting a list of ready files. Rollback is deleting the new files and reverting the config and hook edits.

## Open Questions

- Whether a portal tab should show a slice's staleness (list slices, mark stale ones). It would not change the specs here.
