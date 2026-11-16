# Proposal

## Why

Code in the viewer reaches `viewer/shared/` with climbs such as `../../../../../../shared/ids.ts`. There are 260 imports over 80 files that climb two or more folders, and about 220 of them point at `viewer/shared/`. Long climbs are hard to read, break when a file moves, and hide which zone an import crosses into.

## What Changes

- Add three import aliases, defined once in the `imports` field of `viewer/package.json`: `#shared/*`, `#backend/*` and `#frontend/*`. Node reads that field at run time, `tsc` reads it when type-checking, and Vite is expected to read it for the frontend build.
- Rewrite every import that climbs two or more folders into a zone boundary (`../../shared/x.ts` becomes `#shared/x.ts`). The rewrite touches `viewer/backend/`, `viewer/frontend/src/`, `viewer/scripts/` and `viewer/test/`.
- Keep short relative imports (`../types.ts`, `./x.ts`) and relative imports inside one feature as they are.
- Keep imports inside `viewer/shared/` relative, because `sync-skill-logic.ts` follows only relative imports when it copies logic into `toolkit/skills/*/lib/`.
- Teach `viewer/test/zones.test.ts` to resolve `#` imports to the zone they point at, so the one-way zone rules still bite.
- Document the convention in CLAUDE.md and the wiki.

No behaviour changes: the viewer serves and builds exactly as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a code-structure change, so the change sets `skip_specs: true`.

## Impact

- `viewer/package.json` (new `imports` field), about 80 source files in `viewer/` (import lines only), `viewer/test/zones.test.ts`.
- `CLAUDE.md` and the wiki page that describes the zones and import rules; `python scripts/check_docs.py` must pass.
- No new dependency. The toolkit and the generated skill copies are untouched.
