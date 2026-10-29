---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.yml"
  - "**/*.yaml"
  - "**/*.json"
  - "**/*.toml"
---
# Config files

Config hygiene for YAML, JSON and TOML files. It adds to [jois-code-core-principles](jois-code-core-principles.md) and [jois-code-architecture-boundaries](jois-code-architecture-boundaries.md) and does not restate them.

## Secrets

- Never commit secrets such as tokens, passwords or private keys.
- Reference a secret from the environment or a secret store.
- Commit an example file with placeholders instead.

## Loading and change

- Validate the config against a schema when the program loads it.
- Fail fast and name the bad key.
- Add a new key with a safe default, so existing files keep working.
- Change config additively.
- Never rename, remove or repurpose a key without a migration path.

## Environments

- Keep environment-specific values, such as hosts, ports, paths and credentials, in per-environment files or variables.
- Keep them out of the shared base file.

## Syntax and reuse

- Quote YAML values that could be misparsed, such as `"no"`, `"1.10"`, `"0755"` and strings with `:` or `#`.
- Never duplicate a key.
- Never copy a block between files.
- Share a block with anchors, includes or one shared file.

## Dependencies

- Commit lockfiles.
- Never hand-edit a lockfile; regenerate it with the tool.
- Shared packages use no wildcard or floating dependency versions, such as `*` or `latest`.
- Declare a dependency on another package in the same workspace through the workspace mechanism.
- Never declare it by copying code or by a relative path.

## Prefer

- State a key's meaning in its name or an adjacent comment: units, allowed values and default.
- In JSON, where comments are not allowed, document keys in the schema.
- Keep keys grouped consistently within a file.
- Keep one concern per file.
