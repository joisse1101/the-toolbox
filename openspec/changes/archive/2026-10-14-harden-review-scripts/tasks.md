## 1. Module setup

- [x] 1.1 `git mv server.js server.cjs` and add `"type": "module"` to `package.json`; verify `node server.cjs` starts and `GET /api/...` still answers
- [x] 1.2 Update `npm start`, the `createRequire` paths in `write-review.mjs` and `read-backlog.mjs`, and every other `server.js` reference (`grep -rn "server\.js"` outside `openspec/changes/archive`): `CLAUDE.md`, `README.md`, `vite.config.mjs` comments, `src/shared/files.js` message; verify the grep finds no stale reference
- [x] 1.3 Verify `node --test test/*.test.mjs` passes and that running `read-backlog.mjs` and `write-review.mjs` prints no `MODULE_TYPELESS_PACKAGE_JSON` warning; verify `npm run build` still succeeds

## 2. Better errors

- [x] 2.1 In `write-review.mjs`, report the `JSON.parse` message plus line, column and a short excerpt around the failure; add a test with a missing comma that checks the message names the position
- [x] 2.2 Make validation errors from a batch say they refer to "this batch"; verify with a test that checks the wording and that the finding number is still reported
- [x] 2.3 In `guard-bash.mjs`, make every deny message list the allowed forms (`read-backlog.mjs [name]`, `write-review.mjs <name> <<'JSON'`, `write-review.mjs <name> --append <<'JSON'`); add `test/guard-bash.test.mjs` covering the allowed forms and a table of denied commands (extra argument, output path, trailing text after `JSON`, other commands) and verify the messages contain the allowed forms

## 3. Append mode

- [x] 3.1 Extend the argument handling in `write-review.mjs` to accept `<name>` or `<name> --append` and reject everything else; verify the usage error for other arguments in a test
- [x] 3.2 Implement append: parse the existing review (empty if missing), validate the batch alone, reject a batch whose Group already exists in the file, `fillCurrent`, restore statuses from `reviews/<name>.decided`, write existing + batch atomically; verify with tests for three batches giving all rows, invalid middle batch keeping earlier rows and allowing the third, and a reused Group rejected
- [x] 3.3 On a non-append run, save the old non-`open` rows to `reviews/<name>.decided`, merged over an earlier one, and confirm the file API never lists it; verify with tests that a `dismissed` row repeated in a later `--append` batch stays `dismissed` and that an `.tmp`/`.decided` file is not returned by `GET` of the reviews list
- [x] 3.4 Update `guard-bash.mjs` to allow `write-review.mjs <name> --append <<'JSON'` (same heredoc rules as the plain form); verify the guard test allows it and still denies `--append` with extra arguments or on `read-backlog.mjs`
- [x] 3.5 Make the success line report the batch size and the total rows in the file; verify in a test

## 4. Skill instructions and docs

- [x] 4.1 Update `SKILL.md` "Write the review file": write findings in batches of about 8-10 rows (the first plain, the rest `--append`), keep each split group inside one batch, and say what to do when a batch is rejected (fix and resend only that batch); verify the text matches the script's behaviour by running the documented commands once against a copy of a backlog
- [x] 4.2 Update `CLAUDE.md` where it describes `write-review.mjs` and the commands (`node server.cjs`); verify no mention of the old name remains
- [x] 4.3 Run `openspec validate harden-review-scripts` and verify it passes
