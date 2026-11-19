# Design

## Context

See proposal.md - Why. The zone rules are checked today by `viewer/test/zones.test.ts`, which parses imports itself. The viewer is on TypeScript 7.0.2, the native compiler. It ships no importable compiler API, and `typescript-eslint` (as of its 8.x line, which declares `typescript >=4.8.4 <6.1.0`) needs that API to parse TypeScript. So ESLint cannot sit next to `typescript@7` without a workaround.

A spike in `.scratch/linter-spike/` (run before this change was written, and now deleted apart from its config) showed the workaround works. With `typescript` pointed at `@typescript/typescript6@6.0.2`, ESLint 10, `typescript-eslint` and `eslint-plugin-boundaries` 7 parsed every `.ts`, `.tsx` and `.mjs` file in `viewer/` and `toolkit/`. The plugin resolved the `#` aliases, reported no breach on the current code, and reported every breach in nine hand-made cases (shared to backend by alias and by relative path, backend to frontend, frontend to backend, `shared/` to `app/`, a feature to another feature, the toolkit to `viewer/shared/` and `viewer/backend/`). A tool importing another tool could not be tried because the repo has only the `backlog` tool; it uses the same capture mechanism as the feature case. The spike did not run the real `tsc` next to the shim, so that is the first thing to verify.

## Goals / Non-Goals

**Goals:**
- One command, `npm run lint` from `viewer/`, that fails on a zone breach or a general rule violation, and the same command in CI.
- The zone rules written as data (element types and policies), with no hand-written import parser.
- A guard that proves the zone rules still fire.

**Non-Goals:**
- No type-aware lint rules. They would need the full compiler API and slow the run, and `tsc` already covers type errors.
- No formatter such as Prettier, and no style rules. The change adds no formatting churn.
- No pre-push hook and no change to GitHub settings. Branch protection is the repo owner's step.
- No new rule that forces alias use.

## Decisions

### Zone rules in `eslint-plugin-boundaries`

The rules go in `viewer/eslint.config.mjs` as element descriptors (`shared`, `backend`, a feature, a tool's own `shared/`, a tool, frontend `shared/`, `app/`, the frontend root, `toolkit`) and one `boundaries/dependencies` policy list with the default set to disallow. The element descriptors capture the tool and feature names, so one policy says "a feature may import only its own feature" instead of listing tools, which keeps the rule true when a second tool is added. The spike config is the starting point, with the rule for `viewer/test/` unchanged: tests are not scanned, as today.

Alternatives were `no-restricted-imports` per folder, which needs a hard-coded list of tools, and `dependency-cruiser`, which needs a second config and a second command beside ESLint. The plugin keeps the zone rules and the general rules in one tool.

### The TypeScript 7 workaround

`viewer/package.json` names the old API package for the linter and the native compiler for the typecheck: `typescript` is aliased to `npm:@typescript/typescript6@6.0.2`, and the native compiler is installed under a second name, `@typescript/native`, aliased to `npm:typescript@7.0.2`. The `typecheck` script then runs the native compiler by that second name. A short comment in the wiki says the alias is temporary and can go when TypeScript 7.1 ships a compiler API that `typescript-eslint` supports. If both packages claim the `tsc` binary, the script calls the native one by its path inside `node_modules/@typescript/native`.

Alternatives were waiting for TypeScript 7.1, which leaves "never push broken code" blocked for an unknown time, and swapping the linter for Biome or `dependency-cruiser`, which gives up the single-tool zone rules.

### Where the lint script runs

ESLint ignores files outside the folder its config is based on, and the `toolkit/` zone sits above `viewer/`. The `lint` script therefore changes to the repo root and passes the config explicitly: `cd .. && eslint -c viewer/eslint.config.mjs viewer toolkit`. ESLint resolves the plugins from the config file's folder, so they are found in `viewer/node_modules/`, and the element patterns are written relative to the repo root (`viewer/shared/**`), as in the spike. The cost is that the script depends on a `cd`, which npm runs the same way on Windows and Linux.

### A guard that the zone rules fire

A new test, `viewer/test/lint/zones.test.ts`, runs the ESLint Node API on text it supplies under real zone paths (`lintText` with a `filePath`), so no fixture file sits in the source tree. Each case is one breach the old test covered, and the test expects the `boundaries/dependencies` error. A few clean cases expect no error. Imports must name files that exist, because the plugin ignores an import it cannot resolve; the cases use real files such as `viewer/backend/storage/paths.ts`. The `boundaries/no-unknown-files` rule is switched on for the four zone folders, so a new folder that no element descriptor matches fails lint, which replaces the old "the rules cover the layout" test.

### What replaces the unmapped-alias check

The old test reported a `#` import that no alias maps. The plugin ignores unresolved imports, but `tsc` fails on them in all three typecheck configs, so the check moves to `npm run typecheck` and the guard test does not repeat it.

### General rules, kept small

The config uses `typescript-eslint`'s recommended set without type information, `eslint-plugin-react-hooks` for the frontend, and the unused-variable and unused-import rules. The first run on the current code decides what is reported. A real problem is fixed in the same change. A rule that reports only noise is turned off in the config with a comment that says why, rather than disabled line by line.

### CI workflow

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`, with `permissions: contents: read`. It has two jobs on `ubuntu-latest`. The viewer job uses Node 24 and `npm ci` in `viewer/`, then runs `npm run lint`, `npm run typecheck`, `npm run build` and `npm test`. The toolkit job uses Python 3.12 and Node 24, installs `toolkit/requirements.txt` into the runner's own environment, then runs `python check_toolkit.py`, `python -m pytest` and `node --test` on the story tests, from the commands in CLAUDE.md. The two jobs run in parallel so a failure in one does not hide the other. The existing `docs-check.yml` stays as it is.

## Risks / Trade-offs

[The two TypeScript packages clash on the `tsc` binary or on editor tooling] → Verify in the first task that `npm run typecheck` still reports the same result as before; call the native compiler by path if the binary clashes.

[The alias is still needed after TypeScript 7.1] → The wiki note names the condition for removing it.

[Tests and scripts that only ever ran on Windows fail on Linux, for example on line endings or path separators] → Run the full CI commands once locally with LF endings, and fix real failures in the same change; the toolkit job is the likelier source.

[A guard test is slow because it starts ESLint] → It lints a handful of short strings; the config is loaded once for the whole file.

[A new tool or feature folder is not matched by an element descriptor] → `boundaries/no-unknown-files` turns that into a lint error with the file name.

[A required CI check does nothing until branch protection is on] → The workflow follow-up in tasks.md names this as a manual step for the repo owner, and the docs do not claim the repo is protected.

## Migration Plan

Land the config, the TypeScript alias and the guard test first, with the old zones test still in place, so both checks agree on the current code. Then delete `zones.test.ts`, add the CI workflow, and update the docs. To roll back, revert the commits; nothing outside the repo changes.
