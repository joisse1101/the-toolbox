---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.java"
---
# Java

Java mechanics. It adds to [jois-code-core-principles](jois-code-core-principles.md) and does not restate them.

## Exceptions

- Never catch `Exception` or `Throwable` broadly.
- Never leave a catch block empty.
- Catch the narrowest type that can be handled.
- Otherwise wrap the error in a domain exception and keep the cause.
- Use unchecked exceptions for programming errors.
- Use checked exceptions only where callers can recover.

## Resources and values

- Close resources with try-with-resources, never by hand in `finally`.
- Never return `null` where an empty collection or an `Optional` fits.
- Use `Optional` for return values only, never for fields or parameters.
- Validate at the boundary with `Objects.requireNonNull` or Bean Validation, and reject early.

## Classes and dependencies

- Make classes and fields `final` and immutable by default.
- Use records for plain data.
- Never expose a mutable internal collection; return an unmodifiable copy.
- Inject dependencies through the constructor.
- Never use field injection, static mutable state or a service locator.

## Layers

- Keep controllers thin, with no business logic or persistence code in them.
- Domain and repository classes never import web-layer types. See [jois-code-architecture-boundaries](jois-code-architecture-boundaries.md).

## Safety and tests

- Use parameterized queries only.
- Never build SQL or other queries by string concatenation.
- Never compare strings or boxed values with `==`.
- Compare with `equals`, and override `hashCode` together with it.
- In tests, inject a clock and a random source instead of reading the system's.

## Prefer

- Name tests for the behavior, such as `returnsEmptyWhenNoMatch`.
- Test one behavior per test.
- Use `var` only where the type is obvious from the right-hand side.
