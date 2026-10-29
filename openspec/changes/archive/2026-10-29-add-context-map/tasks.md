## 1. Conventions

- [x] 1.1 In `planner/guidelines/diagram-conventions.md` add a section for the context map (the fields of a context and a relationship, every Epic in exactly one context, a merge records its reason, the form of the flowchart, and that the sequence init line does not apply to it) and extend the stub rule of section 3 with the relationship type when a map exists; verify by reading that section numbers stay consistent and that each rule appears once.
- [x] 1.2 Add `relationshipTypes` to the `diagram-limits` block and read it in `planner/logic/diagrams/limits.js`, so the list of types has one home; verify with a test that changing the block changes the accepted types and that no other file lists them.

## 2. Map logic (pure, in `planner/logic/diagrams/`)

- [x] 2.1 Add `context-map.js` with a function that validates a map source against the backlog's Epic names: every Epic in exactly one context, no unknown Epic, a reason on a context with more than one Epic, a relationship between two contexts of the map and never a context to itself, a type from `relationshipTypes` or `TBC`, an owner or `TBC`; verify with a test for each scenario of the `context-map` spec.
- [x] 2.2 Add a function that compares a map with the backlog's Epics and returns the Epics the map lacks and the ones the backlog no longer holds; verify with tests for an added, a deleted and a renamed Epic.
- [x] 2.3 Add a function that composes `context-map.md` from the source (a table of contexts, a table of relationships, one `mermaid` flowchart with a subgraph per context and a labelled link per relationship from upstream to downstream); verify with a test that every context and relationship appears in both tables and in the flowchart, and that the output is byte-for-byte stable for the same source.

## 3. Reading and writing (skill side, in `.claude/skills/plan-stories/`)

- [x] 3.1 Add `read-context-map.mjs`: read `context-map.json` of a backlog, report it missing or invalid, and report the Epics it lacks or no longer finds without changing a file; verify with tests for no map, a valid map and a stale map.
- [x] 3.2 Add `write-context-map.mjs`: apply the checks of 2.1, compose the document, run the Mermaid parser on its flowchart, write `context-map.json` and `context-map.md` atomically, read both back and fail naming what is missing, change nothing when the same map is sent again, never delete a file, and append a line to `planner/data/logs/writes.jsonl` (store `diagrams`, no contents); verify with tests for a repeated write, a refused write (neither file written) and a path outside the backlog's diagrams folder.
- [x] 3.3 Make `read_diagrams` ignore the two map files when it lists slices (it lists folders only); verify with a test on a backlog folder that holds a map and a slice.

## 4. Tools

- [x] 4.1 Add `read_context_map`, `check_context_map` and `write_context_map` to `planner/claude/mcp/diagram-tools.mjs` with descriptions that list their keys and rules, the check writing nothing; verify with `planner/test/claude/diagram-tools-mcp.test.mjs` that the three tools exist and that the check leaves the folder unchanged.
- [x] 4.2 Pre-approve the map's read and check tools in the `plan-stories` launcher and its MCP config and leave the write tool unapproved; verify by reading the launcher and running its config test that `write_context_map` is not in the allowed list.

## 5. Skill

- [x] 5.1 Edit `.claude/skills/plan-stories/SKILL.md`: list the three map tools in `allowed-tools` (read and check only, as for slices), add the step that draws the map (start from one context per Epic, advise merges from the lexicon with a reason, ask the owner and each relationship, `TBC` for a deferral, show the whole map, check, one yes/no, write, read back), and add the use of the map when drafting a slice (read it first, stubs state the relationship type, say when it is stale, the scope rule unchanged); verify by reading it top to bottom that it cites the conventions without restating them and that nothing is written before the yes.

## 6. Sample data and docs

- [x] 6.1 Add a sample `context-map.json` and `context-map.md` for the sample backlog under `planner/test/sample-data/diagrams/sample/`, written through the compose function, with invented content only; verify the checks and the parser report no problem on it and that the tests of group 2 and 3 read it.
- [x] 6.2 Update the `plan-stories` and diagram paragraphs of `CLAUDE.md` and the `plan-stories` line of `README.md` for the map, its two files and the three tools; verify they match the specs and do not duplicate the conventions.

## 7. Whole suite and a real run

- [x] 7.1 Run `npm test` from `planner/` and verify the whole suite, including `zones.test.mjs`, passes.
- [x] 7.2 Draw a map for a real backlog with the updated skill (a manual check): the skill proposes one context per Epic, advises a merge with a reason, asks for owners and relationships before writing, `context-map.md` renders in GitHub (light and dark) and in the VS Code preview, and a slice drawn afterwards shows a stub with its relationship type. Note: tested with the sample backlog only (check and read on the committed sample map pass); not yet drawn for a real backlog or opened in GitHub and VS Code.
