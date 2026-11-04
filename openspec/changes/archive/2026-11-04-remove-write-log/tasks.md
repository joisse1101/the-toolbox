# Tasks

## 1. Remove the log from the writers and the server

- [x] 1.1 Remove the log calls from `planner/logic/skill-support/write-atomic.mjs` and the `writer` and `log` arguments of `writeAtomic`, update its callers, and verify `grep -rn "logWrite" planner toolkit` finds nothing outside tests. (result: Grep logWrite in planner and toolkit -> 0 matches; writeAtomic is (dir, file, text) and all 7 callers pass 3 arguments)
- [x] 1.2 Remove the log calls and imports from `planner/portal/server/server.cjs`, `read-diagrams.mjs`, `write-diagram.mjs` and `write-context-map.mjs`, and verify the server and writer tests still pass for their data writes. (result: grep for write-log|logWrite|logFile in server.cjs, read-diagrams.mjs, write-diagram.mjs, write-context-map.mjs -> only backlogFile hits, no log import or call; server-project.test.mjs filtered to 10 tests -> 10 pass, 0 fail, exit 0; server-files + server-start tests -> 15 pass, 0 fail; write-lexicon 13/13, suggest-lexicon 4/4, write-review 32/32, write-proposal 33 of 34, diagram-scripts 15 of 20, all failures log helper or log assertions (task 3.1) except "renumber is healed" and "one failing diagram", which also fail on HEAD. Excluded and not run: server-project "switch while idle" (asserts writes.jsonl, task 3.1) and "check, init and copy" (expects logs from init, task 2.1/2.2), so the data-write assertions of "switch while idle" are unverified)
- [x] 1.3 Delete `planner/logic/storage/write-log.cjs` and `logFile` in `backlog-paths.cjs`, run `node planner/scripts/sync-skill-logic.mjs`, and verify `planner/test/skill-sync.test.mjs` passes with no `write-log.cjs` under any skill's `lib/`. (result: sync-skill-logic.mjs -> ran, no write-log.cjs output; skill-sync.test.mjs -> 4 pass, 0 fail; Glob **/write-log.cjs -> none found)

## 2. Init and copy

- [x] 2.1 Make `initFolders` in `planner/logic/storage/project-folders.cjs` create only the data folder, update `planner/test/logic/project-folders.test.mjs` to the new scenarios of `project-config`, and verify the tests pass. (result: `node --test --test-timeout=30000 --import ./test/setup.mjs test/logic/project-folders.test.mjs` -> 26 tests, 26 pass, 0 fail)
- [x] 2.2 Update the server and Settings-tab tests that expect `logs` in the init or copy reply, and verify `npm test` in `planner/` passes. (result: planner `node --test --test-timeout=30000 --import ./test/setup.mjs test/*.test.mjs test/*/*.test.mjs` -> exit 0, 448 tests, 448 pass, 0 fail, no timeout or hang)

## 3. Tests

- [x] 3.1 Delete `planner/test/logic/write-log.test.mjs` and `planner/test/portal/server-log.test.mjs`, remove the log helpers from both `backlog-tree.mjs` files and the log assertions from the writer, server and layout tests, and verify no test references `writes.jsonl`. (result: Grep for writes.jsonl|logFile|readLog|logLines|logPath|logWrite|write-log over planner/test and toolkit/tests -> no test references writes.jsonl; the only write-log hit is the skill-sync assertion that the copy is absent; two log test files deleted and both backlog-tree.mjs log helpers removed)
- [x] 3.2 Verify `npm test` in `planner/` and `node --test <abs>/toolkit/tests/story/*.test.mjs` both pass. (result: planner `node --test --test-timeout=30000 --import ./test/setup.mjs test/*.test.mjs test/*/*.test.mjs` -> exit 0, 448 pass, 0 fail; `node --test --test-timeout=30000 <abs>/toolkit/tests/story/*.test.mjs` -> exit 0, 364 pass, 0 fail, after the LF rule for the toolkit fixtures in .gitattributes)

## 4. Docs

- [x] 4.1 Remove the log from `README.md` (data table, layout block, Settings tab line) and `CLAUDE.md`, keeping the note that `logs` is a reserved backlog name for leftover folders, and verify `grep -n "writes.jsonl" README.md CLAUDE.md` finds nothing. (result: `grep -n "writes.jsonl" README.md CLAUDE.md` -> no matches, exit 1; wider grep for write log/write-log/logFile -> only `backlogFile`, a real name)
- [x] 4.2 Remove the sentence about the write log from `toolkit/skills/jois-story-propose/SKILL.md` and verify the skill's tests pass. (result: `node --test --test-timeout=30000` on write-proposal, write-lexicon, suggest-lexicon and write-review -> 82 pass, 0 fail, exit 0)
