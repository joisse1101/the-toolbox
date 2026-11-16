# Tasks

## 1. Tooling

- [x] 1.1 Add `typescript`, `@types/node`, `@types/react` and `@types/react-dom` to `viewer/package.json` as dev dependencies, with exact versions, through `npm install` in `viewer/`. Add `tsconfig.base.json`, `tsconfig.node.json` and `frontend/tsconfig.json` as `design.md` describes, and the `typecheck` script. Verify: `npx tsc -p tsconfig.node.json --showConfig` and `npx tsc -p frontend/tsconfig.json --showConfig` both exit 0 in `viewer/` (the full type check can only pass once `.ts` files exist).

## 2. Shared code and the skill copies

- [x] 2.1 `git mv` each file in `viewer/shared/` to `.ts` (the `.cjs` and `.mjs` files too) in one rename-only commit, and fix the specifiers that name them across `viewer/`. Verify: `cd viewer; npm test` and `npm run build` pass.
- [x] 2.2 Type `viewer/shared/`: add `shared/types.ts` with the shapes listed in `design.md`, turn the CommonJS modules into ES modules, and keep to erasable syntax. Verify: `tsc -p tsconfig.node.json` reports no error in `shared/`, and `cd viewer; npm test` passes.
- [x] 2.3 Convert `scripts/sync-skill-logic.mjs` to `.ts` so it strips types with `module.stripTypeScriptTypes` and writes `.mjs` copies with `.ts` specifiers rewritten, as `design.md` says. Run it, and delete the old `.js` and `.cjs` copies it no longer writes. Update `test/skill-sync.test` to match. Verify: the sync test passes, and `find toolkit/skills -path '*/lib/*' -name '*.cjs' -o -path '*/lib/*' -name '*.js'` prints nothing.
- [x] 2.4 Change every story skill script's `./lib/...` import to the `.mjs` copy, and replace each `createRequire` use for a copy with an `import`. Update the "generated copy" section of `wiki/viewer/architecture/Story-Skills-Internals.md`. Verify: `grep -rn "createRequire" toolkit/skills --include=*.mjs | grep -v /lib/` lists no use that loads `./lib/`, `node --test <abs>/toolkit/tests/story/*.test.mjs` passes, and `cd toolkit; python -m pytest` passes through the toolkit's `.venv`.
- [x] 2.5 Run the edited skills' scripts in the sample's mock repo, as CLAUDE.md says for a skill edit. Build the repo with `toolkit\sample\story-to-code\build-mock-repo.ps1 -Stage proposed -Reset`, then reinstall `jois-story-review`, `jois-story-propose`, `jois-story-explore` and `jois-story-plan` at project scope with `-Force`. From `.scratch/mock-app/`, run `node .claude/skills/jois-story-review/read-backlog.mjs habits` and `node .claude/skills/jois-story-plan/read-diagrams.mjs habits`. Verify: both print the backlog context with no module-loading error, and `node --test toolkit/tests/story/sample-stages.test.mjs` passes.

## 3. Backend and scripts

- [x] 3.1 `git mv` `backend/**` and `scripts/start.mjs` to `.ts` in a rename-only commit. Then type them, turn `server.cjs` into an ES module, and point `package.json` (`start`) and `start.ts` at `node backend/server.ts`. Verify: `tsc -p tsconfig.node.json` reports no error in `backend/` or `scripts/`, `cd viewer; npm test` passes, and `npm start -- --no-open` serves the app (stop it afterwards).
- [x] 3.2 Update `wiki/viewer/architecture/Logic-Layer.md` and `Data-Folder.md` for the new file names and the end of the `.cjs` rule. Verify: `python scripts/check_docs.py` passes.

## 4. Frontend

- [x] 4.1 `git mv` every file in `frontend/src/` to `.ts` or `.tsx` (JSX files to `.tsx`), and `vite.config.mjs` to `vite.config.ts`, in a rename-only commit. Fix `index.html` and the npm scripts. Verify: `cd viewer; npm run build` passes.
- [x] 4.2 Type the frontend: component props, hook returns, reducer state and actions, and the API client (`shared/api/files.ts`), using `viewer/shared/types.ts` for the data shapes. Verify: `tsc -p frontend/tsconfig.json` reports no error, and `npm run build` passes.
- [x] 4.3 Update `wiki/viewer/architecture/Portal.md` for the new file names. Verify: `python scripts/check_docs.py` passes.

## 5. Tests and repo docs

- [x] 5.1 `git mv` every test and helper under `viewer/test/` to `.ts` (`setup.mjs` to `setup.ts`) in a rename-only commit, then type them. Change the `test` script to `node --test --import ./test/setup.ts "test/**/*.test.ts"`, and make the zones test scan `.ts` and `.tsx`. Verify: `cd viewer; npm test` runs the same number of tests as before this group, all passing, and `npm run typecheck` passes.
- [x] 5.2 Update `CLAUDE.md`: the commands (typecheck, single test file with `.ts`), "There is no linter or type checker", and the `.cjs` paragraph. Update the README's folder table. Verify: `python scripts/check_docs.py` passes, and `grep -rn "\.cjs\|\.mjs" CLAUDE.md` names only toolkit scripts.

## 6. Whole-change test run

- [x] 6.1 Run every check and fix any failure this change caused. (`openspec validate --all --strict` exits 1 on 31 warnings in specs this change does not touch; the user accepted them on 2026-11-16. `openspec validate viewer-typescript --strict` exits 0.) Verify: `cd viewer; npm run typecheck`, `cd viewer; npm test`, `cd viewer; npm run build`, `node --test <abs>/toolkit/tests/story/*.test.mjs`, `cd toolkit; python check_toolkit.py; python -m pytest` (through the toolkit's `.venv`), `python scripts/check_docs.py` and `openspec validate --all --strict` each exit 0.

## Workflow follow-up

- Archive with `/opsx:archive` after review.
- Reinstall the toolkit globally so installed skills get the `.mjs` copies. This is the user's step, because it writes to `~/.claude`.
