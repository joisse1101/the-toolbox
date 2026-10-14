## Why

A real review session hit three problems with the review-backlog scripts. A full set of findings (~11 KB of JSON) failed twice as a single heredoc with `unexpected EOF`, and because `write-review.mjs` rewrites the whole review on every run, findings could not be written in batches and five had to be dropped. A malformed input and a denied command both produced messages too thin to diagnose. And every script run prints a `MODULE_TYPELESS_PACKAGE_JSON` warning. The planned write-story skills will reuse the same write pattern, so it should be fixed first.

## What Changes

- `write-review.mjs` gets an `--append` flag. Without it, behaviour is unchanged (the run replaces the review). With it, the batch is validated on its own and its rows are added to the existing review file, so a long review is written as several small heredocs.
- Statuses decided in an earlier review (`applied`, `dismissed`) survive a multi-batch run: the first batch saves them aside and later batches restore them.
- A batch that reuses a `Group` name already in the review file is rejected, so a split group is never divided across batches.
- A JSON parse failure reports the parser's message and position instead of "not valid JSON".
- `guard-bash.mjs` allows `write-review.mjs <file> --append <<'JSON'`, and its deny messages list the allowed command forms.
- `package.json` gets `"type": "module"` and `server.js` is renamed to `server.cjs` (it is CommonJS), removing the Node warning. `npm start`, the `createRequire` paths in `write-review.mjs` and `read-backlog.mjs`, tests, `CLAUDE.md`, `README.md` and comments are updated.
- `SKILL.md` tells the reviewer to write in batches of a few findings (first batch plain, the rest with `--append`) and to keep split groups inside one batch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-review-suggestions`: "Single write path for reviews" (the argument rules and the allowed command forms), "Script validates findings" (error detail and group-across-batch rule) and "Safe, repeatable writes" (append batches and status preservation).

## Impact

- `.claude/skills/review-backlog/write-review.mjs`, `guard-bash.mjs`, `read-backlog.mjs`, `SKILL.md`
- `package.json`, `server.js` -> `server.cjs`, `vite.config.mjs` (comments)
- `test/write-review.test.mjs` plus new tests for the guard and append mode
- `CLAUDE.md`, `README.md`
- No change to the review CSV format, the portal, or the server's behaviour.
