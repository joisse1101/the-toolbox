---
metadata:
  version: "1.0.0"
  last_updated: "2026-10-29"
---
# Test with mock data

Applies whenever you test or verify a change. It extends the principle in `jois-code-core-principles`
that tests never touch real user state from test code to your own verification steps.

- Test and verify with mock or fixture data and mock or stubbed systems by default.
- Never push, publish, send, deploy or write to a real external system, and never use real user
  data, credentials or state, to test or verify a change. To see how a push, publish, send or
  deploy behaves, use a mock or stub of that system.
- When test data is needed, build it from the codebase first. Reuse existing fixtures and sample
  data, derive the shape from schemas, types, models and existing tests, create mock data from
  that shape and test on it.
- Only when the codebase does not give enough to build mock data, ask the user for mock data or
  for the shape of the data (schema or fields). Never ask for real data.
- Use real data or a real system only when the user explicitly asks for it in the current request.
  An earlier approval does not carry over.
