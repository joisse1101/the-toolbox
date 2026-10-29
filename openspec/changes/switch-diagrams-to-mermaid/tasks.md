## 1. Syntax spike and conventions

- [x] 1.1 In a scratch folder, write one markdown file with a class diagram and a sequence diagram that use the forms the conventions will name (a stereotype in a class label and in a participant label, a `rect` block opening with `Note over ... : Phase 1 - <name>`, `alt` / `else`, `phase.step` ids in messages); verify each block parses with Mermaid's parser (with the DOM shim) and that the file draws without error in the VS Code markdown preview and in GitHub (the user opens it on GitHub), then record the label form that works in task 1.2.
- [x] 1.2 Rewrite `planner/guidelines/diagram-conventions.md` for Mermaid: the `diagram-limits` block keeps `maxClasses` and `stereotypes` and drops `palette`; section 2 states the one-document layout (`source.json` and `UC-<slice>.md`); section 3 the Mermaid subset, the stereotype-in-label form from 1.1, step ids, the `rect` and `Note over` phase and the story-ID rule; section 4 adds `## Class diagram` and `## Sequence diagrams` with a `### Sequence: <flow>` heading per flow; section 7 says how to view a slice in GitHub and in VS Code. Verify by reading that sections 1-7 number consistently, that no sentence mentions PlantUML, a palette color or `!include`, and that each rule appears once.

## 2. Parser dependency

- [x] 2.1 Add `mermaid` and `jsdom` to `planner/package.json` at exact versions (Mermaid 11 was probed) and update the lockfile; verify `npm install` succeeds from `planner/` and `npm ls mermaid jsdom` shows one version of each.
- [x] 2.2 Add a skill-side module in `.claude/skills/plan-stories/` that builds the DOM shim, loads Mermaid once and exposes `parseMermaid(text)` returning `{ ok }` or `{ ok: false, message, line }`; verify with unit tests that a valid class diagram (with `namespace` and a stereotype), a valid sequence diagram (with `rect`, `Note over`, `alt`) and a broken one give the expected result.
- [x] 2.3 Verify `planner/test/zones.test.mjs` still passes: nothing under `planner/logic/` or `planner/portal/` imports `mermaid` or `jsdom`, and the portal build (`npm run build`) does not bundle them.

## 3. Structural checks (pure, in `planner/logic/diagrams/`)

- [x] 3.1 Update `limits.js` to read `maxClasses` and `stereotypes` and ignore a `palette` key if present; verify its tests pass without a palette in the block.
- [x] 3.2 Add a function that reads `UC-<slice>.md` into its headings and `mermaid` fences with line numbers; verify with tests for a block under no heading, a heading with no block, a heading with two blocks and a block of another diagram type (each names the heading or line).
- [x] 3.3 Replace the PlantUML parsing in `checks.js` with a check on a fence's text: stereotype in every class and participant label and in the conventions, participants declared before use, `phase.step` ids that increase and match the `rect` and `Note over` phase, an `alt` flag per diagram, the class count against `maxClasses`, no story-ID-shaped text; drop the `@startuml` name rule and the palette check; verify with tests for each rule, including a step in the wrong phase and a missing stereotype.
- [x] 3.4 Update `checkSpec` so each flow is a `### Sequence: <flow>` heading of the document, an acceptance-criteria row's `Flow` must name one, and a failure row needs an `alt` in that flow's diagram; verify with tests for a flow without a diagram and a failure without an `alt`.
- [x] 3.5 Reject any submitted file other than `UC-<slice>.md`, with the message that a slice is one document plus `source.json`; verify with a test for a second document.

## 4. Tools and writers

- [x] 4.1 In `write-diagram.mjs` and the check path of `check_diagram`, take the document as the only file, run the structural checks, then `parseMermaid` on each fence, and report every problem with the heading and the line; verify with `planner/test/claude/diagram-scripts.test.mjs` that a document with one bad diagram writes nothing and lists the parser's message.
- [x] 4.2 In `read-diagrams.mjs`, make the ID repair rewrite only the generated story list of the document; verify with a test that every `mermaid` block is byte-for-byte as before after a repair.
- [x] 4.3 Update the tool descriptions and the `files` wording in `planner/claude/mcp/diagram-tools.mjs` (one document, Mermaid, no `.puml`); verify `planner/test/claude/diagram-tools-mcp.test.mjs` passes.

## 5. Mock slice

- [x] 5.1 Replace the three `.puml` files and `UC-sign-in.md` of `planner/test/sample-data/diagrams/sample/sign-in/` with one `UC-sign-in.md` holding the specification, `## Class diagram` and a `### Sequence: login` and `### Sequence: reset` block, drawn from the same classes and flows as before; keep `source.json` and its hashes unchanged and the generated story list block unchanged; verify the checks and the parser report no problem on it.
- [x] 5.2 Open the mock slice in GitHub and in the built-in VS Code markdown preview; verify every diagram draws with no error in place of a picture (a manual check; note the extension and Mermaid versions used in the commit message of the change).

## 6. Skill and docs

- [x] 6.1 Edit `.claude/skills/plan-stories/SKILL.md`: the `description` and Draft section say one document with fenced Mermaid diagrams, the confirm step shows that document whole (in sections when too long), and the write-and-read-back section tells the user the document opens in GitHub or the built-in VS Code markdown preview, with no PlantUML plugin or render server; verify by reading it top to bottom and that it cites the conventions without restating them.
- [x] 6.2 Update the `plan-stories` and diagram paragraphs of `CLAUDE.md` and the PlantUML line of `README.md`; verify `git grep -in "puml\|plantuml"` outside `openspec/changes/archive/` and the other open changes returns nothing.

## 7. Whole suite

- [x] 7.1 Update `planner/test/logic/diagram-checks.test.mjs`, `planner/test/claude/diagram-scripts.test.mjs` and `planner/test/claude/diagram-tools-mcp.test.mjs` wherever they build or read a slice in the old layout; verify each passes alone.
- [x] 7.2 Run `npm test` from `planner/` and verify the whole suite, including `zones.test.mjs`, passes.
- [ ] 7.3 Draw one slice from scratch with the updated skill (a manual check); verify the document passes `check_diagram` and renders in both viewers.
