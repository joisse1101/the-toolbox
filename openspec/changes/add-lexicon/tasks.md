## 1. Lexicon core

- [x] 1.1 Add `core/lexicon.js` with `parseLexicon`, `composeLexicon` and the file-name helper (`IAM.csv` -> `IAM.md`); verify with `test/lexicon.test.mjs` that parse then compose round-trips a canonical file byte for byte, keeps preamble, unknown `Label:` lines and multi-line Definition/Notes, and that a missing file parses as an empty lexicon
- [x] 1.2 Add the term rules to `core/lexicon.js` (`saveTerm`, `renameTerm`, `deleteTerm`, `lexiconProblems`: unique ignoring case, Definition required, Part of exists / not self / no cycle, Avoid word not a term name, delete refused while children exist, rename rewrites children); verify each scenario of "Term rules" in `backlog-lexicon` has a passing test in `test/lexicon.test.mjs`
- [x] 1.3 Add the patch/add application used by the writer (`applyTermItems`: input keys `term`, `definition`, `avoid`, `notes`, `partOf`; unknown key rejected; `partOf: ""` and `avoid: []` clear; whole-result validation so a parent added earlier in the input is accepted; all problems reported by item position); verify with tests for each scenario in `lexicon-writer`

## 2. File store

- [x] 2.1 Give `validateName` in `core/file-name.cjs` an `ext` argument defaulting to `.csv`; verify the existing name-rule tests still pass and new tests cover `.md` (traversal, reserved names, length, forced suffix)
- [x] 2.2 Change `STORES` in `app/backend/server.cjs` to `{ dir, ext }`, add `lexicons` (`.md`), and pass the store's ext through list, create, read/write, rename and `uniqueName`; verify with the server running that `GET /api/lexicons/files` lists only `.md`, `PUT/POST` of `IAM.md` works, `IAM.md` in `user-stories` is rejected, and the CSV stores behave as before
- [x] 2.3 Confirm `backups` is still not reachable and `core/backup.cjs` is unchanged; verify by running `npm test` (backup tests pass)

## 3. Lexicon tab

- [x] 3.1 Add an optional `serialize` argument to `useAutosave` (default `serializeBacklog`); verify `npm test` still passes and that the backlog still autosaves in the browser
- [x] 3.2 Add `hooks/useLexicon.js` (load `lexicons/<name>.md` with a missing file as empty, create on first save, reducer for add/edit/rename/delete using the core rules, `settle` and `refreshFromDisk`); verify with a reducer test in `test/` where the hook's reducer is pure (as `useProposals` does) covering add, rename with children, refused delete, and refused save leaving state unchanged
- [x] 3.3 Add `components/LexiconTab.jsx` (term list grouped under parents, search over name/definition/avoid, form with name, parent, definition, avoid, notes, inline rule errors, raw text shown) and wire the always-present Lexicon tab, the Reload refresh and the Backup `settle` into `App.jsx`; verify in the browser with `npm run build` and the running server: add "Dataset" and "Dataset attribute", see the indent, search "member", rename the parent, try deleting it, edit a definition and reload to confirm the file `data/lexicons/<name>.md` holds it

## 4. Switch the lexicon file from markdown to CSV

The first version stored `lexicons/<name>.md`; the decision changed to CSV (Excel, backups). Groups 1-3 above stay as built where they are format-independent (the rules, the reducer, the hook, the tab).

- [x] 4.1 Replace the markdown parser in `core/lexicon.js` with a CSV one (`parseLexicon`/`composeLexicon` over `{ headers, hasBom, terms }`; columns `Term, Part of, Definition, Avoid, Notes` by header name ignoring case; `Avoid` split on `;`; unknown columns kept in `cells`; missing known columns added on save; empty file gives the default headers); remove `lexiconFileName`; verify `test/lexicon.test.mjs` round-trips a canonical file byte for byte, keeps an unknown `Owner` column and BOM/CRLF, reads an Excel-style header, and still passes every rule and `applyTermItems` test
- [x] 4.2 Remove the `.md` file type: drop the `ext` argument from `validateName` and the `STORE_EXT` table from `app/backend/server.cjs`, keep the `lexicons` entry in `STORES`, and delete the `.md` cases from `test/file-name.test.mjs`; verify with the server running that `GET /api/lexicons/files` lists `.csv` files and `.md` files are ignored, and `npm test` passes
- [x] 4.3 Add `lexicons` to `STORE_NAMES` in `core/backup.cjs`; verify `test/backup.test.mjs` lists four stores, and with the server running that a backup of a backlog with a lexicon holds `lexicons/<name>`, the backups list names it and a compare shows a changed definition
- [x] 4.4 Update `useLexicon` (no name mapping; load and save `lexicons/<name>`, parse and compose the CSV) and `LexiconTab` (remove the "text kept as written" parts, which no longer exist); verify `npm run build` passes, `test/lexicon-reducer.test.mjs` passes and in the browser the demo lexicon opens from a CSV, edits save, and the Backups tab diffs a lexicon change

## 5. Skills

- [x] 5.1 Add `.claude/skills/propose-stories/write-lexicon.mjs` (backlog name validation, backlog must exist, JSON list from stdin, atomic temp-and-rename write, success message listing added and patched terms); verify with `test/write-lexicon.test.mjs` covering every scenario in `lexicon-writer`, including that `user-stories/`, `proposals/` and `reviews/` are unchanged
- [x] 5.2 Extend `read-story-context.mjs` to print the lexicon section after the proposals (labelled as data; one-line note when absent) and `guard-bash.mjs` to allow `write-lexicon.mjs <file> <<'JSON'` in `--read-write` only; verify with the updated `test/read-story-context.test.mjs` and `test/guard-story-bash.test.mjs` (allowed in propose, denied in explore, other forms denied)
- [x] 5.3 Update `explore-stories/SKILL.md`, `propose-stories/SKILL.md`, `/story:propose` and both `locked-settings.json` if the allowed commands are listed there: use lexicon terms and avoid listed words, show lexicon changes with old and new values in the single yes/no, write the lexicon first; verify with `test/propose-skill.test.mjs` extended for the new wording and by running a read-write launcher session that adds a term and a story that uses it

## 6. Docs and wrap-up

- [x] 6.1 Update `CLAUDE.md` and `README.md` (the `lexicons` store, `core/lexicon.js`, the tab, the writer and guard form, the lexicon in backups); verify the architecture notes match the code by reading them against the diff
- [x] 6.2 Run `npm test` and `npm run build`, then `openspec validate add-lexicon --strict`; verify all pass before archiving
