# Design

## Context

See proposal.md - Why. The backend, scripts and tests run as plain `.ts` files under Node's type stripping, with no bundler, so an alias must be something Node resolves itself. The frontend is bundled by Vite and checked by `tsc` with `moduleResolution: bundler`; the other code is checked with `nodenext`. `viewer/shared/` is copied by `viewer/scripts/sync-skill-logic.ts`, which follows and rewrites only relative imports, and `viewer/test/zones.test.ts` scans relative imports to enforce the one-way zone rules.

## Goals / Non-Goals

**Goals:**
- One alias definition that Node, `tsc` and Vite all honour, with no loader, no extra build step and no second list to keep in sync.
- Aliased imports cross zones in a way the zones test can still check.

**Non-Goals:**
- No aliases inside `viewer/shared/` or in `toolkit/`.
- No new lint rule that forces alias use; the convention lives in the docs and the zones test.
- No change to the `@`-scoped npm packages already in use.

## Decisions

1. **Use `package.json` `imports` with `#` names.** Node accepts only `#`-prefixed keys there. Alternatives: tsconfig `paths` with `@` names fails at Node run time for the backend and tests; a Node resolve hook or `tsx` adds a loader that must be registered in every entry point; a scoped self-reference name (`@toolbox/viewer/...`) is untested with Vite and abuses `exports`. The `#` form works natively in all three tools.
2. **Three aliases, one per zone:** `"#shared/*": "./shared/*"`, `"#backend/*": "./backend/*"`, `"#frontend/*": "./frontend/*"`. Specifiers keep the `.ts` or `.tsx` extension, as imports do today (`allowImportingTsExtensions`).
3. **Alias only imports that cross a zone or climb two or more folders to another part of the same zone; leave nearer relative imports alone.** A feature's own `../types.ts` stays short, and relative paths inside a feature keep the feature-isolation rule visible. Tests import the code under test through the alias.
4. **Keep `viewer/shared/` internals relative.** The sync script's regexes only match `./` and `../` specifiers, so aliases there would break the generated skill copies.
5. **The zones test resolves `#zone/...` to `viewer/zone/...`** before applying its allowed-folder and frontend rules. It gets a new case that fails on an alias which breaks a rule (for example, `shared/` importing `#backend/...`), and it also reports a `#` import that no alias maps.
6. **Rewrite by script, then review.** A throwaway script under `.scratch/` rewrites imports whose resolved target is in another zone or two or more folders up, and is deleted afterwards. The existing test and typecheck suites are the safety net.

## Risks / Trade-offs

- [Vite may not resolve `imports` aliases as expected] → Task 1 is a spike that builds the frontend with one aliased import before anything is rewritten; if it fails, the fallback is a matching `resolve.alias` in `vite.config.ts` generated from the same `imports` field.
- [`tsc` resolves the aliases differently under `nodenext` and `bundler`] → The spike also runs all three typecheck configs.
- [The zones test goes blind to aliased imports] → Decision 5, with a test that proves it catches a breach.
- [A large mechanical diff is hard to review] → Per `jois-git-commit-hygiene`, the import rewrite is one concern; the config, the zones test and the docs ship in a separate commit before it.
