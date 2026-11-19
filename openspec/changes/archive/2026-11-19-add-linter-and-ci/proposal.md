# Proposal

## Why

The repo has no linter, and CI never runs the tests, the typecheck or the build: `.github/workflows/` has only the docs check and the wiki publish. A broken change can reach `main` unnoticed. The import rules between the zones (see CLAUDE.md) are checked only by `viewer/test/zones.test.ts`, a hand-built import parser of about 180 lines that must be kept in step with the `#` aliases. A linter checks the same rules in the editor as well as in CI, and a CI workflow makes "never push broken code" a failing check instead of a habit.

## What Changes

- Add ESLint 10 with `typescript-eslint` and `eslint-plugin-boundaries` to `viewer/` (dev dependencies only), with one `viewer/eslint.config.mjs` and a `lint` npm script.
- Express the zone rules as `boundaries` policies: the zone rules, and the three frontend rules (`shared/` stays below `tools/` and `app/`, a tool imports no other tool, a feature imports no other feature). The plugin resolves the `#shared/*`, `#backend/*` and `#frontend/*` aliases itself, so nothing reads `package.json` by hand.
- Add a few small must-fail example files with a test that runs ESLint on them and expects the zone errors, so a config that stops matching cannot pass silently.
- Add a few general rules: `typescript-eslint` recommended (not type-aware), the React hooks rules, and unused code. Fix or justify what they report on the current code.
- Remove `viewer/test/zones.test.ts` and its alias-reading code.
- Because TypeScript 7 has no importable compiler API, point `typescript` at `@typescript/typescript6` for the linter's parser and install the native compiler under a second name so `npm run typecheck` still runs the native `tsc`. Document this as temporary until TypeScript 7.1.
- Add a `.github/workflows/ci.yml` that runs on every pull request: install, lint, typecheck, build and test, plus the toolkit's own Python and Node tests.
- Update CLAUDE.md and the wiki pages that name `zones.test.ts`.
- Not in the repo: switching on a GitHub branch-protection rule that requires the CI check. The change lists this as a manual step for the repo owner.

No behaviour changes: the viewer builds and serves as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is tooling, so the change sets `skip_specs: true`.

## Impact

- `viewer/package.json` and `package-lock.json` (new dev dependencies, new scripts, the `typescript` alias), new `viewer/eslint.config.mjs`, new lint example files and test.
- Deleted: `viewer/test/zones.test.ts`.
- New `.github/workflows/ci.yml`. Dependabot already covers `viewer/`.
- A few source edits wherever the new general rules report a real problem (for example the stray `react-hooks/exhaustive-deps` comment in `LexiconTab.tsx`).
- CLAUDE.md (Commands, Zones) and the wiki pages `Logic-Layer.md`, `Portal.md` and `Workflow.md`; `python scripts/check_docs.py` must pass.
- Risk: the tests have only run on Windows, so the first run on Linux in CI may expose line-ending or path-separator problems that need fixing.
