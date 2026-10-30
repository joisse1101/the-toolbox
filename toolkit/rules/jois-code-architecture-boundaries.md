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
# Architecture boundaries

How frontend, backend and shared code relate. It applies to code in every project.

## Imports

- A backend module never imports frontend code.
- A frontend module never imports backend code.
- Share code through a shared package or generated definitions.
- A data or domain layer never imports web-framework code, such as request and response types, routers or middleware.
- Frameworks depend on the data or domain layer, never the reverse.

## Contracts

- A contract that crosses a boundary lives in one shared or generated definition.
  - Examples: client types that mirror server JSON, an OpenAPI file, a shared schema or generated types.
- Change both sides of a contract together.
- Never change a payload shape on one side only.

## Requests and security

- A request carries a correlation ID (one ID that follows the request across services) from the client through every backend hop.
- Logs on that path include the correlation ID.
- Enforce authorization on the server.
- Hiding a control in the UI is not security.

## Configuration

- Validate configuration files against a schema at startup.
- Fail fast on a mismatch.
- Keep environment-specific values out of code and out of committed config.
- Keep secrets out of code and out of committed config.
