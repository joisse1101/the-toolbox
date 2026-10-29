---
metadata:
  version: "1.1.1"
  last_updated: "2026-10-29"
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.html"
---
# TypeScript and React

TypeScript and React mechanics. It adds to [jois-code-core-principles](jois-code-core-principles.md) and does not restate them.

## Types

- Never use `any`.
- Use `unknown` and narrow it, including the error in a `catch`.
- Model closed sets as string-literal unions or discriminated unions.
- Type every exported function's parameters and return value.
- Type data from the network at the boundary.
- Validate it there, for example with a schema library, rather than casting with `as`.

## Errors and async

- Check `response.ok` after `fetch` and throw on failure.
- Never assume success.
- Never leave a promise floating: `await` it, return it, or handle its rejection.
- Run independent awaits together with `Promise.all`.
- Do not await in sequence what does not depend on the previous result.

## State and immutability

- Never mutate state, props or shared objects.
- Copy with spread, such as `{ ...user, name }` or `[...items, x]`.
- Compute a value from props or state during render.
- Do not copy it into state and sync it by effect.
- When new state depends on old state, use the functional update, such as `setCount(c => c + 1)`.

## Components and hooks

- Use function components with typed props.
- Keep hooks at the top level, never in conditions or loops.
- Give every effect a correct dependency list.
- Clean up what an effect starts: timers, listeners, subscriptions and requests.
- Never call the backend from a component directly.
- Go through the project's single API client wrapper, so auth, base URL and error handling live in one place.

## Prefer

- Extract a custom hook when stateful logic repeats, and name it `useX`.
- Use early returns or `&&` for simple conditional rendering.
- Avoid nested ternaries in JSX.
- Take colors and spacing from design tokens (CSS variables), not literals.
- Put component styles in a colocated CSS module.
- Define breakpoints in one place and reference them everywhere.
- Give views the same data at every screen size.
- Adapt layout with CSS, not with different data.
