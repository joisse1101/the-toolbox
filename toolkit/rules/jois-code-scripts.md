---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.ps1"
  - "**/*.sh"
  - "**/*.bat"
---
# Scripts

Mechanics for PowerShell, Bash and batch scripts. It adds to [jois-code-core-principles](jois-code-core-principles.md) and does not restate them.

## Failing

- Fail fast.
- In PowerShell, use `Set-StrictMode -Version Latest` and `$ErrorActionPreference = 'Stop'`.
- In Bash, use `set -euo pipefail`.
- In batch, check `%ERRORLEVEL%` after every command that can fail.
- Return a non-zero exit code on failure, so callers can detect it.

## Re-runs and cleanup

- Make a re-run safe.
- Check state before changing it: create if missing, skip if present.
- A second run then does nothing harmful.
- Clean up temporary files and processes on exit, with `finally` or `trap`.

## Paths and quoting

- Quote every variable and path expansion, such as `"$path"` or `-LiteralPath`.
- Quoting stops spaces and special characters from splitting or expanding.
- Never hardcode machine-specific paths or user names.
- Derive them from the script's own location, such as `$PSScriptRoot` or `"$(dirname "$0")"`.
- Otherwise take them as parameters.

## Input and secrets

- Validate parameters up front.
- Print a clear error with the expected usage.
- Never put secrets in a script or its arguments.
- Read secrets from the environment.

## Destructive actions

- Make destructive actions explicit: support a dry run or a confirmation.
- Never run a broad `rm -rf` or `Remove-Item -Recurse` on a variable that could be empty.

## Prefer

- A short usage comment or `-Help` at the top.
- Parameters over interactive prompts, so the script runs unattended.
