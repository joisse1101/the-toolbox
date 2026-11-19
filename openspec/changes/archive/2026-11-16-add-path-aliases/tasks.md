# Tasks

## 1. Alias definition and spike

- [x] 1.1 Add the `imports` field (`#shared/*`, `#backend/*`, `#frontend/*`) to `viewer/package.json`; verify `node` resolves it by running a scratch `.ts` file under `.scratch/` that imports `#shared/ids.ts`
- [x] 1.2 Switch one frontend file and one test file to an alias; verify `npm run typecheck` passes for all three configs and `npm run build` succeeds (if Vite does not resolve it, add the fallback from design.md decision 1)

## 2. Zones test and docs

- [x] 2.1 Update `viewer/test/zones.test.ts` to resolve `#` imports to their zone and add a case that fails on a breaching alias and on an unmapped `#` import; verify `node --test viewer/test/zones.test.ts` passes
- [x] 2.2 Document the alias convention (what to alias, what stays relative, `shared/` stays relative and why) in `CLAUDE.md` and the wiki page for the zones; verify `python scripts/check_docs.py` passes

## 3. Rewrite imports

- [x] 3.1 Write a throwaway rewrite script in `.scratch/`, run it over `viewer/backend`, `viewer/frontend/src`, `viewer/scripts` and `viewer/test`, then delete it; verify no import climbing two or more folders into another zone remains (`grep` for `\.\./\.\./` targeting `shared`, `backend` or `frontend`)
- [x] 3.2 Review the diff for imports inside `viewer/shared/` or `toolkit/` (there must be none) and for relative imports that should have stayed; verify `git diff --stat` touches only import lines

## 4. Integration check

- [x] 4.1 Run the whole change's checks and fix any failure: `cd viewer; npm run typecheck; npm test; npm run build`, then `node scripts/sync-skill-logic.ts` and confirm `git status` shows no change under `toolkit/skills/*/lib/`; verify all commands exit 0
