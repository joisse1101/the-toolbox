---
metadata:
  version: "1.2.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.py"
  - "**/*.java"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.ps1"
  - "**/*.sh"
  - "**/*.bat"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.cs"
  - "**/*.kt"
  - "**/*.rb"
  - "**/*.php"
  - "**/*.c"
  - "**/*.h"
  - "**/*.cpp"
  - "**/*.swift"
  - "**/*.sql"
---
# Core principles

Language-agnostic principles for all code. Technology rules add mechanics, not new principles.

## Simplicity

- Follow KISS (keep it simple), DRY (do not repeat yourself) and YAGNI (you aren't gonna need it).
- Build the simplest thing that works.
- Add a feature, option or abstraction only when a second real use needs it.
- Extract repeated logic once the repetition is real.
- Write code for a person to read first.
- Use descriptive names and give each function one job.
- Avoid a clever construct that needs decoding.

## Structure

- Give each unit one responsibility.
- Keep layers isolated: business logic never knows about HTTP, database drivers or the UI.
- Keep pure logic apart from I/O, so it can be tested directly.

## Errors and boundaries

- Fail fast at boundaries: validate input where it enters.
- Reject bad data with a clear error.
- Never swallow an error.
- Handle a failure at the layer that can act on it.
- Otherwise let the failure propagate with context.
- No empty catch blocks.
- No silent defaults that hide a failure.

## Behavior

- Make operations idempotent: running one twice leaves the same result as running it once.
- Keep behavior deterministic, with no hidden global state.
- Tests never touch real user state, such as real home folders, databases or credentials.
- Treat configuration as data.
- Never hardcode environment values such as hosts, paths, ports or keys.

## Change and logging

- Evolve schemas and APIs additively and backward-compatibly.
- Never remove or repurpose a field without a migration path.
- Log at boundaries and on failure.
- Log as structured key/value pairs or JSON, not free-form strings.
- Include enough context to diagnose the problem.
- Never log secrets or personal data.

## Done

- Run the project's build and type-check before calling a change done.
