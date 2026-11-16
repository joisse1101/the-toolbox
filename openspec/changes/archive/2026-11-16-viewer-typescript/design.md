# Design

## Context

This design assumes the layout after `viewer-single-page-app`: `viewer/{backend,frontend,shared,scripts,test}` with one `package.json`. The code is ES modules in `.js`, `.jsx` and `.mjs` files. The exceptions are the server and its storage modules, plus the shared `storage/` and `skill-support/paths` modules, which are CommonJS (`.cjs`) so that ES-module skill scripts can load them with `createRequire`.

The sync script copies shared files into `toolkit/skills/*/lib/` under their own names. The skill scripts import the `.js` and `.mjs` copies, and load the `.cjs` copies through `createRequire` (34 places).

Node 24 runs a `.ts` file by replacing its type annotations with spaces, a process called type stripping. It refuses TypeScript syntax that would need real code generated, such as `enum`, `namespace` and constructor parameter properties. It also needs every relative import to name the real file, extension included (`./model.ts`).

See proposal.md for why.

## Goals / Non-Goals

**Goals:**

- No build step for anything Node runs: server, scripts, tests.
- A strict type check that passes over all viewer code, run with one command.
- Installed skills see no difference: plain JavaScript copies, the same behaviour.

**Non-Goals:**

- Converting the toolkit's own scripts to TypeScript. Installed skills run on users' machines with whatever Node they have, so they stay plain JavaScript.
- A linter or formatter.
- DOM or React tests.

## Decisions

### Erasable syntax only, with `.ts` in imports

Every file obeys TypeScript's `erasableSyntaxOnly` and `verbatimModuleSyntax` settings:

- No `enum`: use a `const` object with `as const` and a union type.
- No `namespace` and no parameter properties.
- Type-only imports are written as `import type`.

Relative imports name the `.ts` or `.tsx` file (`allowImportingTsExtensions`).

The alternative was compiling with `tsc` or a bundler before Node runs anything. We rejected it because it brings back a build step for the server and the tests, and output folders to keep in sync. Vite already handles `.ts` imports for the frontend.

### Two type-check projects

`tsc` has no single setting that fits both browser and Node code, so the type check is split:

- **`viewer/tsconfig.node.json`** covers `backend/`, `shared/`, `scripts/` and `test/`, with Node types and no DOM. It uses `module: nodenext`, so it checks imports the way Node resolves them.
- **`viewer/frontend/tsconfig.json`** covers `frontend/src/` and the `shared/` files it imports, with DOM types, `vite/client` types (for `?raw` imports of the guidelines) and `jsx: react-jsx`. It uses `moduleResolution: bundler`.

Both extend `viewer/tsconfig.base.json` (`strict`, `noEmit`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `skipLibCheck`). `npm run typecheck` runs `tsc -p tsconfig.node.json && tsc -p frontend/tsconfig.json && tsc -p test/frontend/tsconfig.json`.

The frontend tests get a third small config, `viewer/test/frontend/tsconfig.json`, because they import browser code and run under Node, so they need DOM and Node types together. It extends the frontend config and adds the Node types, and the Node project excludes `test/frontend/`, which keeps DOM out of the Node project.

### CommonJS ends

The `.cjs` modules become ES modules. `__dirname` becomes `import.meta.dirname`, and `require` becomes `import`. The lazy `require` inside a function in the storage modules becomes a dynamic `import()` or moves to the top of the file, whichever keeps the sync script's rule ("a lazy import is not followed") true. CLAUDE.md drops its `.cjs` paragraph.

### Shared data types

`viewer/shared/types.ts` holds the shapes the server, the browser and the skills share:

- story, backlog and the backlog file;
- review row and proposal;
- lexicon term and lexicon suggestion;
- project config and saved project;
- the API's error reply.

Types used by one module stay in that module. The shapes come from the existing parsers and their tests, not from guesses. Where a parser accepts loose input, its type says so (`unknown` at the edge, narrowed by the existing checks).

### The sync script writes `.mjs` copies

`scripts/sync-skill-logic.ts` reads each shared `.ts` file and removes the types with Node's built-in `module.stripTypeScriptTypes`, the same stripping Node applies when it runs the source. It writes the result as `lib/<path>.mjs`. Relative specifiers ending in `.ts` are rewritten to `.mjs`.

An `.mjs` file is an ES module without a `package.json`, so the three skills that have none keep working. The import-following rule (top-level imports only) is unchanged.

The skill scripts then change their `./lib/...` imports to `.mjs`. The `createRequire` calls that loaded the `.cjs` copies become plain `import`s. `toolkit/tests/story/` keeps testing the scripts as before.

The alternative was compiling with the `typescript` package's `transpileModule`. We rejected it because it would make the copies differ from what Node runs. If `stripTypeScriptTypes` prints an experimental warning, the sync script silences that one warning, and nothing else.

### Tests in TypeScript

Test files become `*.test.ts`, and `setup.mjs` becomes `setup.ts`. The test script becomes `node --test --import ./test/setup.ts "test/**/*.test.ts"`. Node 24 runs them directly. The zones test scans `.ts` and `.tsx` as well as any `.js` left, and the sync test compares against the new `.mjs` copies.

### Order of work

Node and Vite both let a `.js` file import a `.ts` file, so the conversion runs zone by zone, and the app works after each group:

1. Tooling.
2. `shared/` with the sync script and skill imports, because the copies depend on it.
3. `backend/` and `scripts/`.
4. `frontend/`.
5. Tests.

Each file is renamed with `git mv` in a commit of its own before it is typed, so history follows the file.

## Risks / Trade-offs

- [Strict mode surfaces many errors in about 120 files] → Convert one zone per group and type-check that zone before the next. Use `unknown` and narrowing at parse edges. Use `any` only with a one-line reason.
- [`stripTypeScriptTypes` is still marked experimental in Node 24] → The sync test compares the generated copies byte for byte, so a change in the stripper's output shows up as a failing test. Switching the sync script to `typescript`'s transpiler is a contained fix.
- [A skill script still loads a copy through `createRequire`] → The `.cjs` copies are deleted when the sync runs, so a missed script fails at once. `toolkit/tests/story/` runs every script.
- [The stripped copies keep blank space where types were] → They are generated files that nobody edits. Their header says so.

## Migration Plan

Nothing for users to migrate. Reinstalling the toolkit picks up the `.mjs` copies.
