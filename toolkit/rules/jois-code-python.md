---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.py"
---
# Python

Python mechanics. It adds to [jois-code-core-principles](jois-code-core-principles.md) and does not restate them.

## Errors

- Never use a bare `except:` or `except Exception: pass`.
- Catch the narrowest type.
- Use `raise ... from err` to keep the cause.
- Never use `assert` for runtime validation, because `-O` removes it.
- Raise a real exception instead.

## Functions and resources

- Never use a mutable default argument, such as `def f(x=[])`.
- Default to `None` and create the value inside the function.
- Use `with` for files, locks, connections and temporary state.
- Never open and close them by hand.
- Use `pathlib.Path` for paths.
- Never build paths by string concatenation or hardcode separators.

## Data and modules

- Annotate public function signatures.
- Use `dataclass` or `pydantic` models for structured data.
- Do not pass loose dicts across layers.
- Validate external input, such as request bodies, files and environment, at the boundary.
- Turn it into typed models there and reject bad data.
- Keep import-time side effects out of modules: no I/O, network or config reading at import.

## Queries and layers

- Use parameterized queries only.
- Never build SQL with f-strings or `%`.
- Keep web handlers thin.
- The data layer imports no web-framework code. See [jois-code-architecture-boundaries](jois-code-architecture-boundaries.md).

## Tests

- Use pytest fixtures to isolate state, such as temp dirs and in-memory databases.
- Never read or write the real home folder.

## Prefer

- Use `logging` with a module logger rather than `print`, beyond a throwaway script.
- Use comprehensions over `map` or `filter` with lambdas when it reads clearer.
- Use `enum` over magic strings for closed sets.
